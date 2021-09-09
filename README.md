# ShinyLight

A lightweight server for R calculations

## Building ShinyLight

To rebuild documentation:

```sh
Rscript -e 'devtools::document()'
```

For development purposes, if you change ShinyLight, you can reinstall with:

```sh
Rscript -e 'install.packages(".",repos=NULL,type="source")'
```

## Run tests

```sh
npm test
```

or

```sh
npm test -- --fgrep 'test that I want' --browser=chrome
```
