-- Synthetic fixtures only. Run AFTER migration, only with explicit remote approval.
begin;
insert into public.metro_passengers(id,name,language,is_demo) values
('10000000-0000-4000-8000-000000000001','Kavya · Demo','ta-IN',true),
('10000000-0000-4000-8000-000000000002','Arun · Demo','en-IN',true),
('10000000-0000-4000-8000-000000000003','Meena · Demo','ta-IN',true)
on conflict do nothing;
insert into public.metro_smart_cards(id,passenger_id,kind,masked_number,status,balance,is_demo,issuer_note,updated_at) values
('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','ncmc','•••• •••• 4201','active',286,true,'Synthetic NCMC fixture; no issuer connection','2026-11-11T08:30:00+05:30'),
('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','ncmc','•••• •••• 4202','active',152,true,'Synthetic NCMC fixture; no issuer connection','2026-11-11T08:30:00+05:30'),
('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000003','ncmc','•••• •••• 4203','active',420,true,'Synthetic NCMC fixture; no issuer connection','2026-11-11T08:30:00+05:30'),
('20000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000002','legacy_cmrl_stored_value','•••• •••• 9201','policy_example',0,true,'Historical policy example; current availability not asserted','2026-11-11T08:30:00+05:30')
on conflict do nothing;
insert into public.metro_transactions(id,passenger_id,card_id,type,amount,status,reference,description,occurred_at,is_demo) values
('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','travel',-32,'success','SIM-TRAVEL-1','Simulated metro journey','2026-11-10T18:40:00+05:30',true),
('30000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','recharge',200,'pending','SIM-RECHARGE-1','Simulated recharge attempt','2026-11-11T08:00:00+05:30',true),
('30000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','travel',-32,'success','SIM-TRAVEL-2','Simulated metro journey','2026-11-10T18:40:00+05:30',true),
('30000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','recharge',200,'success','SIM-RECHARGE-2','Simulated recharge attempt','2026-11-11T08:00:00+05:30',true),
('30000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000003','travel',-32,'success','SIM-TRAVEL-3','Simulated metro journey','2026-11-10T18:40:00+05:30',true),
('30000000-0000-4000-8000-000000000006','10000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000003','recharge',200,'failed','SIM-RECHARGE-3','Simulated recharge attempt','2026-11-11T08:00:00+05:30',true)
on conflict do nothing;
insert into public.metro_recharge_attempts(id,passenger_id,card_id,amount,reference,payment_status,card_update_status,created_at,is_demo) values
('40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',200,'SIM-RECHARGE-1','success','pending','2026-11-11T08:00:00+05:30',true),
('40000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002',200,'SIM-RECHARGE-2','success','success','2026-11-11T08:00:00+05:30',true),
('40000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000003',200,'SIM-RECHARGE-3','failed','unknown','2026-11-11T08:00:00+05:30',true)
on conflict do nothing;
insert into public.metro_stations(code,name_en,name_ta,corridor,operational,source_url,verified_at) values
('AIRPORT','Airport','விமான நிலையம்','Blue',null,'https://chennaimetrorail.org/wp-content/uploads/2026/10/Fare-Table.pdf','2026-11-11'),
('MEENAMBAKKAM','Meenambakkam','மீனம்பாக்கம்','Blue',null,'https://chennaimetrorail.org/wp-content/uploads/2026/10/Fare-Table.pdf','2026-11-11'),
('GUINDY','Guindy','கிண்டி','Blue',null,'https://chennaimetrorail.org/wp-content/uploads/2026/10/Fare-Table.pdf','2026-11-11'),
('NANDANAM','Nandanam','நந்தனம்','Blue',null,'https://chennaimetrorail.org/wp-content/uploads/2026/10/Fare-Table.pdf','2026-11-11'),
('EGMORE','Egmore','எழும்பூர்','Green',null,'https://chennaimetrorail.org/wp-content/uploads/2026/10/Fare-Table.pdf','2026-11-11')
on conflict do nothing;
insert into public.metro_fares(origin,destination,fare_type,amount,effective_from,source_url,verified_at,source_version) values
('AIRPORT','MEENAMBAKKAM','standard',10,null,'https://chennaimetrorail.org/wp-content/uploads/2026/10/Fare-Table.pdf','2026-11-11','cmrl-2026-10-retrieved-2026-11-11'),
('AIRPORT','MEENAMBAKKAM','discounted_20_percent',8,null,'https://chennaimetrorail.org/wp-content/uploads/2026/10/20-discounted-Fare.pdf','2026-11-11','cmrl-2026-10-retrieved-2026-11-11'),
('MEENAMBAKKAM','AIRPORT','standard',10,null,'https://chennaimetrorail.org/wp-content/uploads/2026/10/Fare-Table.pdf','2026-11-11','cmrl-2026-10-retrieved-2026-11-11'),
('MEENAMBAKKAM','AIRPORT','discounted_20_percent',8,null,'https://chennaimetrorail.org/wp-content/uploads/2026/10/20-discounted-Fare.pdf','2026-11-11','cmrl-2026-10-retrieved-2026-11-11'),
('AIRPORT','GUINDY','standard',30,null,'https://chennaimetrorail.org/wp-content/uploads/2026/10/Fare-Table.pdf','2026-11-11','cmrl-2026-10-retrieved-2026-11-11'),
('AIRPORT','GUINDY','discounted_20_percent',24,null,'https://chennaimetrorail.org/wp-content/uploads/2026/10/20-discounted-Fare.pdf','2026-11-11','cmrl-2026-10-retrieved-2026-11-11'),
('GUINDY','AIRPORT','standard',30,null,'https://chennaimetrorail.org/wp-content/uploads/2026/10/Fare-Table.pdf','2026-11-11','cmrl-2026-10-retrieved-2026-11-11'),
('GUINDY','AIRPORT','discounted_20_percent',24,null,'https://chennaimetrorail.org/wp-content/uploads/2026/10/20-discounted-Fare.pdf','2026-11-11','cmrl-2026-10-retrieved-2026-11-11')
on conflict do nothing;
insert into public.metro_knowledge_articles(id,topic,language,question,answer,source_url,source_date,verified_at) values
('lost-card-en','lost_card','en-IN','Can a lost card balance be recovered?','CMRL says lost stored-value and Singara Chennai NCMC balances cannot be transferred or refunded. Lost NCMC offline-wallet funds cannot be blocked.','https://chennaimetrorail.org/wp-content/uploads/2026/01/Press-Release-07.01.2026-English.pdf','2026-01-07','2026-11-11'),
('lost-card-ta','lost_card','ta-IN','தொலைந்த அட்டையின் இருப்பை மீட்க முடியுமா?','தொலைந்த பயண அட்டை மற்றும் Singara Chennai NCMC இருப்பை மாற்றவோ திரும்பப் பெறவோ முடியாது. தொலைந்த NCMC ஆஃப்லைன் வாலட்டை முடக்க முடியாது.','https://chennaimetrorail.org/wp-content/uploads/2026/01/Press-Release-07.01.2026-English.pdf','2026-01-07','2026-11-11')
on conflict do nothing;
commit;
