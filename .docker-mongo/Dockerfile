FROM rocketchat/base:8

ADD . /app
ADD entrypoint.sh /app/bundle/

MAINTAINER buildmaster@rocket.chat

RUN set -x \
 && apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 9DA31620334BD75D9DCB49F368818C72E52529D4 \
 && echo "deb http://repo.mongodb.org/apt/debian stretch/mongodb-org/4.0 main" | tee /etc/apt/sources.list.d/mongodb-org-4.0.list \
 && apt-get update \
 && apt-get install -y --force-yes pwgen mongodb-org \
 && echo "mongodb-org hold" | dpkg --set-selections \
 && echo "mongodb-org-server hold" | dpkg --set-selections \
 && echo "mongodb-org-shell hold" | dpkg --set-selections \
 && echo "mongodb-org-mongos hold" | dpkg --set-selections \
 && echo "mongodb-org-tools hold" | dpkg --set-selections \
 && cd /app/bundle/programs/server \
 && npm install \
 && npm cache clear --force \
 && rm -rf /var/lib/apt/lists/*

VOLUME /app/uploads

WORKDIR /app/bundle

# needs a mongoinstance - defaults to container linking with alias 'mongo'
ENV DEPLOY_METHOD=docker-preview \
    NODE_ENV=production \
    MONGO_URL=mongodb://localhost:27017/rocketchat \
    HOME=/tmp \
    PORT=3000 \
    ROOT_URL=http://localhost:3000 \
    Accounts_AvatarStorePath=/app/uploads

EXPOSE 3000

RUN chmod +x /app/bundle/entrypoint.sh

ENTRYPOINT /app/bundle/entrypoint.sh
