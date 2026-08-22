import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DIRECT_URL);

const holders = await sql`
  select l.pid, l.objid, a.state, a.application_name, a.query
  from pg_locks l
  join pg_stat_activity a on a.pid = l.pid
  where l.locktype = 'advisory'
`;
console.log("ADVISORY LOCK HOLDERS:", JSON.stringify(holders, null, 2));

for (const h of holders) {
  if (h.pid !== undefined) {
    const res = await sql`select pg_terminate_backend(${h.pid}) as ok`;
    console.log("terminated", h.pid, res[0].ok);
  }
}
