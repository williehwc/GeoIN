let page = null;
let resizeTimeout = null;
let map = null;

window.onload = (event) => {
    document.getElementById('slider').addEventListener('input', (e) => {
        const opacity = e.target.value / 100;
        document.getElementById('pdf-canvas').style.opacity = opacity;
    });

    document.getElementById('open').addEventListener('click', () => {
        window.electron.changePdf();
    });

    document.getElementById('save').addEventListener('click', () => {
        const extent = map.getView().calculateExtent(map.getSize());
        // Transform extent from map projection to geographic coordinates
        const transformedExtent = ol.proj.transformExtent(extent, 'EPSG:3857', 'EPSG:4326');
        let ulLat = transformedExtent[3];
        let ulLong = transformedExtent[0];
        let lrLat = transformedExtent[1];
        let lrLong = transformedExtent[2];
        // Get the map width and height in pixels
        const mapWidth = map.getSize()[0];
        const mapHeight = map.getSize()[1];
        // Get the PDF page width and height
        const viewport = page.getViewport({ scale: 1.0 });
        const pdfWidth = viewport.width;
        const pdfHeight = viewport.height;
        if (pdfWidth / pdfHeight < (lrLong - ulLong) / (ulLat - lrLat)) {
            // Pillarboxing
            const longDiff = lrLong - ulLong;
            const adjustment = (longDiff / 2) - ((pdfWidth * mapHeight * longDiff) / (2 * pdfHeight * mapWidth));
            console.log(`Pillarboxing (Longitude) Adjustment: ${adjustment}`);
            ulLong += adjustment;
            lrLong -= adjustment;
        } else {
            // Letterboxing
            const latDiff = ulLat - lrLat;
            const adjustment = (latDiff / 2) - ((pdfHeight * mapWidth * latDiff) / (2 * pdfWidth * mapHeight));
            console.log(`Letterboxing (Latitude) Adjustment: ${adjustment}`);
            ulLat -= adjustment;
            lrLat += adjustment;
        }
        console.log(`Saving PDF with coordinates: UL(${ulLat}, ${ulLong}), LR(${lrLat}, ${lrLong})`);
        window.electron.savePdf(ulLat, ulLong, lrLat, lrLong);
    });

    map = new ol.Map({
        target: 'map',
        layers: [
            new ol.layer.Tile({
                source: new ol.source.OSM()
            })
        ],
        view: new ol.View({
            center: ol.proj.fromLonLat([0, 20]),
            zoom: 3,
            minZoom: 3,
            maxZoom: 19,
            constrainResolution: false // Allows fractional zoom levels
        }),
    });
}

async function loadPDF(filepath) {
    const loadingTask = pdfjsLib.getDocument(filepath);
    const pdf = await loadingTask.promise;
    page = await pdf.getPage(1);
}

async function displayPDF() {
    const canvas = document.getElementById('pdf-canvas');
    const context = canvas.getContext('2d');
    
    // Set canvas size to match container
    const container = document.getElementById('map-container');
    canvas.width = container.clientWidth * 2;
    canvas.height = container.clientHeight * 2;
    
    // Calculate scale to fit page
    const viewport = page.getViewport({ scale: 1.0 });
    const scaleX = canvas.width / viewport.width;
    const scaleY = canvas.height / viewport.height;
    const scale = Math.min(scaleX, scaleY);
    
    const scaledViewport = page.getViewport({ scale });
    
    // Center the page
    const offsetX = (canvas.width - scaledViewport.width) / 2;
    const offsetY = (canvas.height - scaledViewport.height) / 2;
    
    const renderContext = {
        background: 'rgba(0,0,0,0)',
        canvasContext: context,
        viewport: scaledViewport,
        transform: [1, 0, 0, 1, offsetX, offsetY]
    };
    
    await page.render(renderContext);
}

// Listen for PDF file selection
window.electron.onPdfFile(async (path) => {
    await loadPDF(path);
    displayPDF();
});

function handleResizeEnd() {
    if (document.getElementById('pdf-canvas') && page && map) {
        displayPDF();
        map.updateSize();
    }
}

window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(handleResizeEnd, 100);
});