FROM 23-alpine3.20

COPY . /app/
WORKDIR /app
RUN npm run dev