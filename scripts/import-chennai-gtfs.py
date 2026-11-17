#!/usr/bin/env python3
"""Inspect GTFS locally; stage structural data only with reviewed dataset rights.
No network, DB access, fare import, timetable import or runtime promotion.
Reference: ChennaiGTFS's agency-safe/parent-station organization; original implementation.
"""
import argparse, csv, hashlib, io, json, re, zipfile
from datetime import date, datetime
from zoneinfo import ZoneInfo
from pathlib import Path

MAX_BYTES = 80 * 1024 * 1024
MAX_ROWS = 200000

def inspect_feed(feed, manifest, as_of):
    if not re.fullmatch(r'[0-9a-f]{40}', manifest.get('source_commit', '')):
        raise ValueError('Pinned source_commit is required')
    date.fromisoformat(as_of)
    if Path(feed).stat().st_size > MAX_BYTES: raise ValueError('Archive too large')
    raw = Path(feed).read_bytes()
    if len(raw) > MAX_BYTES: raise ValueError('Archive too large')
    digest = hashlib.sha256(raw).hexdigest()
    if digest != manifest.get('sha256'): raise ValueError('Source checksum mismatch')
    with zipfile.ZipFile(io.BytesIO(raw)) as z:
        entries = z.infolist()
        if len(entries) > 50 or sum(e.file_size for e in entries) > MAX_BYTES:
            raise ValueError('Expanded archive too large')
        if any('/' in e.filename or '\\' in e.filename for e in entries):
            raise ValueError('Use an agency-only flat GTFS ZIP; no nested paths')
        names = [e.filename for e in entries]
        if len(set(names)) != len(names): raise ValueError('Duplicate archive members')
        def rows(name):
            if name not in names: return []
            content = z.read(name).decode('utf-8-sig')
            result = list(csv.DictReader(io.StringIO(content)))
            if len(result) > MAX_ROWS: raise ValueError('Too many rows')
            return result
        agency, stops, routes, calendars = [rows(n) for n in ('agency.txt','stops.txt','routes.txt','calendar.txt')]
        if len(agency) != 1 or agency[0].get('agency_id') != 'CMRL':
            raise ValueError('Only an isolated CMRL agency feed is accepted')
        ends = [r.get('end_date','') for r in calendars]
        expired = not ends or max(ends) < as_of.replace('-','')
        warnings = ['fares_excluded','timetables_excluded','not_runtime_verified','network_incomplete_yellow_line_not_established']
        if expired: warnings.append('calendar_expired_or_missing')
        if manifest.get('dataset_license') in (None,'unknown') or manifest.get('redistribution_approved') is not True:
            warnings.append('dataset_rights_not_cleared')
        report = {'source_url':manifest.get('source_url'), 'source_commit':manifest['source_commit'],
                  'sha256':digest,'inspected_at':as_of,'feed_date':manifest.get('feed_date'),
                  'counts':{'stops':len(stops),'routes':len(routes),'calendar_rows':len(calendars)},
                  'calendar_last_day':max(ends) if ends else None,'warnings':warnings,
                  'runtime_eligible':False,'dataset_license':manifest.get('dataset_license','unknown')}
        # No records from unclear-license feeds appear even in this metadata report.
        return report, (stops, routes)

def stage_structure(report, records, manifest):
    if 'dataset_rights_not_cleared' in report['warnings'] or not manifest.get('license_evidence_url'):
        raise ValueError('Dataset redistribution rights and license evidence required; code MIT is insufficient')
    if not manifest.get('reviewed_by') or not str(manifest['license_evidence_url']).startswith('https://'):
        raise ValueError('Record the dataset rights review')
    stops, routes = records
    ids = [s.get('stop_id','') for s in stops]
    if not all(ids) or len(set(ids)) != len(ids): raise ValueError('Missing/duplicate stop IDs')
    if any(s.get('parent_station') and s['parent_station'] not in ids for s in stops):
        raise ValueError('Dangling parent station')
    route_ids = [r.get('route_id','') for r in routes]
    if not all(route_ids) or len(set(route_ids)) != len(route_ids): raise ValueError('Missing/duplicate route IDs')
    # No inferred physical-station merging, line membership, sequence or transfer edges.
    return {'provenance':report,'review_status':'staging_only',
            'stations':[{'id':'CMRL:'+s['stop_id'],'name_en':s.get('stop_name',''),
                         'name_ta':None,'operational':None} for s in stops if s.get('location_type')=='1'],
            'stops':[{'id':'CMRL:'+s['stop_id'],'parent_id':'CMRL:'+s['parent_station'] if s.get('parent_station') else None}
                     for s in stops],
            'routes':[{'id':'CMRL:'+r['route_id'],'name':r.get('route_long_name',''),'operational':None} for r in routes if r.get('route_type')=='1'],
            'fares':[],'timetables':[],'transfers':[]}

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('feed');p.add_argument('--manifest',required=True);p.add_argument('--as-of',default=datetime.now(ZoneInfo("Asia/Kolkata")).date().isoformat());p.add_argument('--output',required=True);p.add_argument('--stage-structure',action='store_true');a=p.parse_args()
    manifest=json.loads(Path(a.manifest).read_text());report,records=inspect_feed(a.feed,manifest,a.as_of)
    output=stage_structure(report,records,manifest) if a.stage_structure else report
    # Exclusive create prevents accidental replacement of any reviewed/runtime files.
    with Path(a.output).open('x') as f: json.dump(output,f,ensure_ascii=False,indent=2);f.write('\n')
    print(json.dumps({'status':'staged' if a.stage_structure else 'inspection_only','runtime_eligible':False,'warnings':report['warnings']}))
if __name__=='__main__':
    try: main()
    except (ValueError,OSError,KeyError,zipfile.BadZipFile,UnicodeError) as e:
        raise SystemExit('GTFS rejected: '+str(e))
