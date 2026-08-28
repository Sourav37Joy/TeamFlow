# Development notes

Two constraints here were discovered the hard way. Both present as failures a long way
from their cause, so they are written down rather than left to be rediscovered.

## The dev runner must emit decorator metadata

`npm run dev` runs `ts-node`, not `tsx`, and they are not interchangeable.

NestJS resolves constructor dependencies from the `design:paramtypes` metadata that
TypeScript emits when `emitDecoratorMetadata` is on. `tsx`, and anything else built on
esbuild, cannot emit that metadata. The code still compiles and the app still boots -
but every injected dependency arrives as `undefined`, and the first request that touches
one fails with `TypeError: Cannot read properties of undefined`, pointing at the guard or
controller rather than at the build.

`ts-node` honours `emitDecoratorMetadata` from `tsconfig.json`. So does `tsc`, which is
why `npm run build` and `npm start` were never affected.

`tsx` is still used for `npm run seed` and `npm test`; neither involves decorators.

## Restarts are driven by nodemon, not `node --watch`

`nodemon.json` watches `src/backend` and only the `.ts` extension.

A bare `node --watch` observes the whole project, which includes `.mongo-data/mongod.log`
- a file MongoDB appends to constantly. That produces a restart loop, and because two
instances then contend for the port, it presents as POST requests resetting the connection
while GET requests still succeed. `--watch-path=./src/backend` did not contain it on
Windows either, restarting roughly twice a second with nothing changing.

Next.js does its own reloading for `src/web`, so the backend is the only tree that needs
watching.

## Local MongoDB

`docker-compose.yml` and `.env` both use **port 27018**, not the default 27017, because a
locally installed MongoDB service may already own 27017 as a standalone. Prisma needs a
replica set for `$transaction`, which the replacement handover depends on, so pointing at
a standalone fails with "replicaSet name rs0 does not match actual name none".

Without Docker, the same thing can be run directly:

```
mongod --dbpath .mongo-data --port 27018 --replSet rs0 --bind_ip 127.0.0.1
mongosh --port 27018 --eval "rs.initiate({_id:'rs0',members:[{_id:0,host:'localhost:27018'}]})"
```
