# ShinyLight

A lightweight server for R calculations.

This project was funded by the Natural Environment Research Council (grant number 09 NE/T001518/1 ("Beyond Isoplot")).

## Building ShinyLight

To rebuild documentation and reinstall the local version of ShinyLight:

```sh
./build.sh
```

## Run tests

```sh
npm test
```

or

```sh
npm test -- --fgrep 'test that I want' --browser=chrome
```

## Run CRAN checks

```sh
./build.sh
_R CMD build .
_R_CHECK_FORCE_SUGGESTS_=true _R_CHECK_CRAN_INCOMING_USE_ASPELL_=true R CMD check --as-cran shinylight_<VERSION>.tar.gz
```
