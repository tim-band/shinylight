#!/bin/sh
# Build and install this R package
Rscript -e "install.packages('devtools')"
Rscript -e "devtools::document()"
npm run prepare
Rscript -e 'devtools::update_packages(devtools::dev_package_deps()$package,dependencies=TRUE)'
Rscript -e "install.packages('.', repos=NULL)"
