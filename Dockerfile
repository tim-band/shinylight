FROM r-base:3.6.3

WORKDIR /app

RUN Rscript --vanilla -e \
    "install.packages(c('remotes','later','jsonlite','httpuv'), \
    repos='https://cloud.r-project.org')"
RUN Rscript --vanilla -e \
    "remotes::install_github('pvermees/geoplotr')"

COPY DESCRIPTION /app/DESCRIPTION
COPY NAMESPACE /app/NAMESPACE
COPY R /app/R
COPY inst /app/inst
COPY build/start-gui.R /app/build/start-gui.R

CMD ["Rscript", "--vanilla", "build/start-gui.R", "0.0.0.0:80"]
