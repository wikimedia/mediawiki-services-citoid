FROM wikimedia/nodejs
RUN mkdir /opt/service
ADD . /opt/service
COPY dist/config.yaml /opt/service/
WORKDIR /opt/service
ENV HOME=/root LINK=g++
RUN npm ci
ENV IN_DOCKER=1
CMD npm start
