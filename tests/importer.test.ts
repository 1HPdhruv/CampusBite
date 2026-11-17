import { it, expect } from "vitest";
import { execFileSync } from "node:child_process";
// Python stdlib handles ZIP/CSV, so the app gains no import dependency.
it("GTFS importer quarantines expired calendars/unclear rights and validates checksums/parents", () => {
  const script = String.raw`
import importlib.util,tempfile,zipfile,csv,io,json,hashlib
from pathlib import Path
spec=importlib.util.spec_from_file_location('metro_import','scripts/import-chennai-gtfs.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
with tempfile.TemporaryDirectory() as d:
 p=Path(d)/'feed.zip'
 def build(parent='S1'):
  with zipfile.ZipFile(p,'w') as z:
   z.writestr('agency.txt','agency_id,agency_name\nCMRL,Synthetic test agency\n')
   z.writestr('stops.txt','stop_id,stop_name,location_type,parent_station\nS1,"Synthetic, station",1,\nP1,Platform,0,'+parent+'\n')
   z.writestr('routes.txt','route_id,route_long_name,route_type\nR1,Synthetic line,1\n')
   z.writestr('calendar.txt','service_id,start_date,end_date\nD,20210420,20211231\n')
   z.writestr('fare_attributes.txt','fare_id,price\nSTALE,999\n')
 build()
 manifest={'source_url':'https://example.com/synthetic','source_commit':'a'*40,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'dataset_license':'unknown','redistribution_approved':False,'feed_date':'2026-10-04'}
 report,records=m.inspect_feed(p,manifest,'2026-11-11')
 assert report['runtime_eligible'] is False and report['calendar_last_day']=='20211231'
 assert 'calendar_expired_or_missing' in report['warnings'] and 'dataset_rights_not_cleared' in report['warnings']
 assert 'Synthetic, station' not in json.dumps(report) and '999' not in json.dumps(report)
 try:m.stage_structure(report,records,manifest);raise AssertionError('unclear rights accepted')
 except ValueError:pass
 approved={**manifest,'dataset_license':'CC0-1.0','redistribution_approved':True,'license_evidence_url':'https://example.com/synthetic-rights','reviewed_by':'Unit test fixture author'}
 cleared,records=m.inspect_feed(p,approved,'2026-11-11');staged=m.stage_structure(cleared,records,approved)
 assert staged['stations'][0]['name_en']=='Synthetic, station' and staged['fares']==[] and staged['transfers']==[]
 assert staged['stations'][0]['operational'] is None
 try:m.inspect_feed(p,{**manifest,'sha256':'bad'},'2026-11-11');raise AssertionError('checksum accepted')
 except ValueError:pass
 build('MISSING');approved['sha256']=hashlib.sha256(p.read_bytes()).hexdigest();report,records=m.inspect_feed(p,approved,'2026-11-11')
 try:m.stage_structure(report,records,approved);raise AssertionError('dangling stop accepted')
 except ValueError:pass
print('GTFS validation passed')
`;
  expect(
    execFileSync("python3", ["-c", script], { encoding: "utf8" }),
  ).toContain("GTFS validation passed");
});
