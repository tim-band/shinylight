#!/bin/sh
# Build and install this R package
Rscript -e "devtools::document()"
npm run prepare
Rscript -e "install.packages('.', repos=NULL)"
