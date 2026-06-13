-- 카공맵 시드 — data/cafes.json (9개) → places 테이블
-- JSON 매핑 규칙:
--   wifi: true → 'yes'        (boolean → 3단계 enum, 안정 여부는 미확인이라 'yes')
--   카공 허용: 별도 컬럼 없음 — 등록된 카페는 모두 카공 허용 전제
--   verified_at: 시드 시점(now())으로 일괄 표기
-- docs/schema.sql 을 먼저 실행한 뒤 적용할 것.

insert into places (name, address, lat, lng, naver_place_url, open_time, close_time, is_24h, iced_americano_price, outlet, wifi, noise, work_fit, tags, verified_at) values
('나루터',                  '서울 송파구 백제고분로41길 19-1 2층',          37.5077632, 127.1072485, 'https://map.naver.com/p/entry/place/1747832649', '12:00', '00:00', false, 4800, 'many', 'yes', 'quiet',  'good', array['넓은매장','대형테이블','콘센트많음','심야영업','책','노트북작업','송리단길'], now()),
('하우피 송리단길',          '서울 송파구 백제고분로41길 24 2층',            37.5080428, 127.1072876, 'https://map.naver.com/p/entry/place/2096443990', '12:00', '21:30', false, 5000, 'many', 'yes', 'quiet',  'good', array['차분함','콘센트넉넉','쉐어테이블','디저트','주차','송리단길'], now()),
('스타벅스 석촌호수점',      '서울 송파구 석촌호수로 262 (송파동)',          37.5095155, 127.1052962, 'https://map.naver.com/p/entry/place/33979877',  '08:00', '22:00', false, 4700, 'some', 'yes', 'quiet',  'ok',   array['석촌호수뷰','넓은매장','3층','통창','콘센트자리한정'], now()),
('카페 마나랑',              '서울 송파구 송파대로49길 37 1층, 2층',         37.5063643, 127.1005789, 'https://map.naver.com/p/entry/place/1059428770', '10:00', '23:00', false, 5500, 'many', 'yes', 'quiet',  'good', array['넓은매장','청음실','LP턴테이블','도서관분위기','콘센트많음','심야영업','집중하기좋음'], now()),
('투썸플레이스 석촌고분역점','서울 송파구 삼학사로 47 1층',                  37.5015983, 127.0966796, 'https://map.naver.com/p/entry/place/1977430414', '08:00', '02:00', false, 4500, 'some', 'yes', 'quiet',  'good', array['넓은매장','뷰','심야영업','주차','콘센트적은편'], now()),
('크레스타운 잠실점',        '서울 송파구 백제고분로 63 1층 101호',          37.5110578, 127.0788222, 'https://map.naver.com/p/entry/place/2056725936', '07:00', '22:00', false, 4300, 'many', 'yes', 'quiet',  'good', array['대형카페','다양한좌석','소파석','단체석','콘센트많음','종합운동장역','노트북작업'], now()),
('스타벅스 잠실역점',        '서울 송파구 송파대로 562 (신천동) 1층,2층',    37.515272,  127.099231,  'https://map.naver.com/p/entry/place/11689864',  '06:30', '22:00', false, 4700, 'many', 'yes', 'normal', 'good', array['2층작업','콘센트넉넉','잠실역','직장인','카공족성지'], now()),
('스타벅스 삼성교점',        '서울 강남구 영동대로86길 12 동남유화빌딩 1층', 37.5079391, 127.0652522, 'https://map.naver.com/p/entry/place/32333720',  '06:30', '22:00', false, 4700, 'many', 'yes', 'normal', 'good', array['넓은매장','대형테이블','스터디','소파석','콘센트좌석','삼성역'], now()),
('테라로사 포스코센터점',    '서울 강남구 테헤란로 440 포스코센터 1층',      37.5060634, 127.0560829, 'https://map.naver.com/p/entry/place/1542149931', '07:30', '21:00', false, 5500, 'some', 'yes', 'normal', 'good', array['대형카페','책많음','통창','2층작업','무료주차','콘센트창가','포스코센터'], now());
