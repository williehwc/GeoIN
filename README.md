GeoIN
=====

Add in geospatial information to your PDFs so you can use them with GeoPDF smartphone apps like [Avenza Maps](https://www.avenza.com/avenza-maps/), perfect for park, trail, and campus maps! Just align the OpenStreetMap to the map in your PDF, save the geospatial PDF, and transfer it to your phone. The next time you visit the location, open the geospatial PDF on your phone and see your location as you move around.

![Screenshot animation](demo.gif)

Download
--------

[Download for Mac or Windows](https://github.com/williehwc/GeoIN/releases)

GDAL
----

This app requires [GDAL](https://gdal.org/en/stable/download.html) to be installed. GDAL is responsible for the actual PDF processing, while this app is a frontend that helps you figure out the coordinates represented in your map.

**Mac** users, install [Homebrew](https://brew.sh/) first if you don't have it yet, and then use it to install [GDAL](https://formulae.brew.sh/formula/gdal) (enter `brew install gdal` in Terminal).

**Windows** users, install [OSGeo4W](https://trac.osgeo.org/osgeo4w/) (select the GDAL package during the installation). Next, search for and select "Edit the system environment variables" in the Start menu, click "Environment Variables…", select the "Path" variable under either "User variables" or "System variables", click "Edit…", click "New", enter `C:\OSGeo4W\bin` (modify if you changed where OSGeo4W was installed), and then click "OK" for each of the three windows opened.

Credits
-------

This app uses Electron, PDF.js, and OpenLayers. The paper in the app icon is from Oxygen Icons, © KDE and licenced under the GNU LGPL version 3.