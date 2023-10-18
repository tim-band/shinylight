#!/bin/sh
# Build and install this R package
Rscript -e "install.packages(c('remotes', 'roxygen2'))"
Rscript -e "roxygen2::document()"
npm run prepare
Rscript -e 'remotes::update_packages(remotes::dev_package_deps()$package,dependencies=TRUE)'
Rscript -e "install.packages('.', repos=NULL)"
