-- Optional additive reference update; review before remote application.
-- Facts independently checked against CMRL October fare PDF and Phase I map.
-- Tamil names are deliberately null pending independent visual/native validation.
begin;
insert into public.metro_stations(code,name_en,name_ta,corridor,operational,source_url,verified_at) values
('ALANDUR','Arignar Anna Alandur Metro',null,'Blue / Green',null,'https://chennaimetrorail.org/wp-content/uploads/2026/10/Fare-Table.pdf','2026-11-11'),
('CENTRAL','Puratchi Thalaivar Dr.M.G.Ramachandran Central Metro',null,'Blue / Green',null,'https://chennaimetrorail.org/wp-content/uploads/2026/10/Fare-Table.pdf','2026-11-11')
on conflict do nothing;
commit;
