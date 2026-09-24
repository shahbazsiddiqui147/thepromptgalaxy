import pg from 'pg'

// bigserial ids and count(*) arrive as strings by default. Ids in this app stay far below 2^53.
pg.types.setTypeParser(pg.types.builtins.INT8, (value: string) => Number(value))
