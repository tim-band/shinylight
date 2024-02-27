#!/bin/sh
# Build and install this R package
Rscript -e "install.packages(c('remotes', 'roxygen2', 'websocket'))"
Rscript -e "roxygen2::roxygenize()"
npm run prepare
Rscript -e 'remotes::update_packages(c("httpuv","later"))'
Rscript -e "install.packages('.', repos=NULL)"
