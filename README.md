# ShinyLight

A lightweight server for R calculations

## Building ShinyLight

```sh
Rscript -e 'devtools::document()'
```

For development purposes, if you change ShinyLight, you can reinstall with:

```sh
Rscript -e 'install.packages(".",repos=NULL,type="source")'
```
