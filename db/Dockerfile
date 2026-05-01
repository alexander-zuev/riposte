FROM postgres:18.3

RUN apt-get update && apt-get install -y \
  postgresql-18-cron \
  postgresql-18-squeeze \
  && rm -rf /var/lib/apt/lists/*
