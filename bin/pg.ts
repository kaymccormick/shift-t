import { Client } from 'pg';

(async () => {
const client = new Client();
await client.connect();

const res = await client.query('select $1::text as message', ['Hello world!']);
console.log(res.rows[0].message);
await client.end();
})();