#!/bin/sh
# Build and install this R package
Rscript -e "install.packages(c('remotes', 'roxygen2'))"
Rscript -e "roxygen2::roxygenize()"
npm install
npm run prepare
Rscript -e 'remotes::update_packages(c("R.utils", "httpuv","later", "jsonlite", "websocket"))'
Rscript -e "install.packages('.', repos=NULL)"
