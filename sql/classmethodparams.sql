select p.name,m.name,c.name,m2.name,p2.name from project p join module m on p.id = m."projectId"
join class c on m.id = c."moduleId"
left join method m2 on c.id = m2."classPropertyId"
left join parameter p2 on m2.id = p2."methodId"
order by p.name,m.name,c.name,m2.name