FROM golang:1.27.2-alpine3.24@sha256:f92b6ef800e499660581efdabdf25d9d817a9d124eaf900924f0504e7e27e12d AS build
ENV CGO_ENABLED=0 GOTOOLCHAIN=local
WORKDIR /source
ADD --checksum=sha256:ea80b27c67711cb32553452dbf5c96b137176b97bfbcacfc6acd88269b64193f https://api.github.com/repos/stripe/stripe-cli/tarball/v1.54.0 /tmp/source.tar.gz
RUN tar xzf /tmp/source.tar.gz --strip-components=1 -C /source
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod --mount=type=cache,target=/root/.cache/go-build go mod download && go mod verify
RUN --mount=type=cache,target=/go/pkg/mod --mount=type=cache,target=/root/.cache/go-build go test ./pkg/config ./pkg/proxy ./pkg/websocket
RUN --mount=type=cache,target=/go/pkg/mod --mount=type=cache,target=/root/.cache/go-build go build -trimpath -buildvcs=false -ldflags '-s -w -X github.com/stripe/stripe-cli/pkg/version.Version=1.54.0-be1' -o /out/stripe ./cmd/stripe && go version -m /out/stripe > /out/buildinfo.txt
FROM scratch AS runtime
COPY --from=build /out/stripe /stripe
COPY --from=build /out/buildinfo.txt /buildinfo.txt
COPY --from=build /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt
USER 1000:1000
WORKDIR /tmp
ENTRYPOINT ["/stripe"]
