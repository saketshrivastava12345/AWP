-- ===========================================================================
-- AURIX seed data
--
-- DATA HONESTY RULE
-- Every numeric figure below is a manufacturer-published or widely-reported
-- specification. Where a figure is contested, market-dependent, or simply not
-- known with confidence, the column is left NULL and the UI renders
-- "Not available" rather than a guess. The `source` and `notes` columns record
-- provenance and caveats.
--
-- Figures are quoted in metric units. Power is stored in metric horsepower
-- (PS/cv) where the manufacturer publishes it that way, which is the
-- convention for all European makers here.
--
-- This script is idempotent: every insert uses ON CONFLICT DO NOTHING against
-- a natural key, so it can be re-run safely.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Countries
-- ---------------------------------------------------------------------------

insert into public.countries (name, slug, iso_code, flag_emoji, description, automotive_history) values
('India', 'india', 'IN', '🇮🇳',
 'The world''s third-largest car market by volume, dominated by compact, high-efficiency vehicles built for dense cities and highly variable road quality.',
 'Indian car manufacturing began under licence in the 1940s and 1950s, with the Hindustan Ambassador and Premier Padmini defining the market for decades. Liberalisation in 1991 opened the country to foreign makers and to joint ventures. Tata Motors launched the Indica in 1998 as the first indigenously developed Indian passenger car, and Mahindra evolved from assembling Willys Jeeps under licence into a major SUV manufacturer. Today India is a significant export hub for compact cars and is scaling domestic EV production.'),

('Germany', 'germany', 'DE', '🇩🇪',
 'The reference point for engineering-led car manufacturing, home to the premium and performance brands that define the global luxury segment.',
 'Karl Benz patented the Benz Patent-Motorwagen in 1886, and Germany has been central to the automobile ever since. The interwar years produced Auto Union and the consolidation that became Mercedes-Benz. Post-war reconstruction was carried by the Volkswagen Beetle, while the Autobahn network and its unrestricted sections pushed German makers toward high-speed stability, brake endurance and aerodynamic discipline — priorities still visible in how German cars are engineered today.'),

('Italy', 'italy', 'IT', '🇮🇹',
 'The home of the exotic sports car, where coachbuilding tradition and motorsport pedigree matter as much as measured performance.',
 'Italian car making grew around Turin and Milan, with FIAT industrialising the motor car for Italy from 1899. The country''s distinctive contribution is the carrozzeria tradition — Pininfarina, Bertone, Zagato — which made body design a discipline in its own right. Enzo Ferrari built road cars to fund racing; Lamborghini was founded in 1963 explicitly as a rival. Emilia-Romagna''s "Motor Valley" remains one of the densest concentrations of performance-car engineering anywhere.'),

('Japan', 'japan', 'JP', '🇯🇵',
 'The world leader in manufacturing quality and reliability engineering, and the origin of both mass-market hybrids and the affordable sports car.',
 'Japan''s industry scaled rapidly after 1945, and by the 1970s its fuel-efficient compacts had reshaped the American market during the oil crises. The Toyota Production System redefined manufacturing worldwide. The late 1980s bubble economy funded an extraordinary run of engineering: the NSX, Supra, GT-R, RX-7 and Miata all arrived within a few years. Toyota''s 1997 Prius made the hybrid powertrain mainstream a decade before rivals followed.'),

('United States', 'united-states', 'US', '🇺🇸',
 'The birthplace of mass production and of the muscle car, and now home to the company that forced the industry''s electric transition.',
 'Ford''s moving assembly line in 1913 made the car an ordinary possession rather than a luxury. Detroit''s Big Three dominated the mid-century, and cheap fuel plus large-displacement V8s produced the muscle car era of the 1960s. The 1973 oil crisis and rising import quality ended that period abruptly. Tesla, founded in 2003, demonstrated that an electric car could be desirable on performance grounds rather than sold on virtue, and pulled the entire industry forward.'),

('United Kingdom', 'united-kingdom', 'GB', '🇬🇧',
 'A concentration of low-volume specialists and motorsport engineering, with more Formula 1 teams based here than in the rest of the world combined.',
 'Britain''s industry was historically fragmented into many small marques, most of which were absorbed into British Leyland and largely lost in the 1970s. What survived and thrived was the specialist end: Lotus, McLaren, Aston Martin, Morgan and Caterham, alongside the "Motorsport Valley" cluster around Oxfordshire and Northamptonshire that supplies most of the world''s top-level racing. Britain also gave the industry the monocoque racing chassis and, through McLaren in 1981, the carbon-fibre composite tub.'),

('France', 'france', 'FR', '🇫🇷',
 'A tradition of inventive, comfort-focused engineering and of small cars designed with unusual rigour.',
 'France produced some of the earliest series-production cars, and Panhard et Levassor established the front-engine, rear-drive layout in 1891. Citroën''s Traction Avant in 1934 combined front-wheel drive with a unitary body years ahead of the mainstream, and the 1955 DS introduced hydropneumatic self-levelling suspension. Post-war France specialised in small, efficient, comfortable cars — the 2CV and Renault 4 among them — and French makers remain strong in the European compact and small-SUV segments.'),

('South Korea', 'south-korea', 'KR', '🇰🇷',
 'The industry''s fastest quality turnaround, moving from budget alternative to design and EV-platform leader within roughly two decades.',
 'Hyundai began by assembling the Ford Cortina under licence in 1968 and produced its first independent car, the Pony, in 1975. Korean cars of the 1990s competed almost entirely on price. A deliberate investment in design and engineering from the early 2000s — including a ten-year warranty in the US to buy credibility — transformed their reputation. The dedicated E-GMP electric platform, launched in 2021 with 800-volt architecture, put Hyundai and Kia ahead of most established rivals on charging speed.'),

('Sweden', 'sweden', 'SE', '🇸🇪',
 'Engineering shaped by long distances, poor winter light and severe weather, producing a national focus on occupant safety.',
 'Volvo was founded in 1927 on the explicit principle that cars are driven by people, and safety must come first. Its engineer Nils Bohlin designed the three-point seatbelt in 1959, and Volvo released the patent for anyone to use — a decision credited with saving over a million lives. Saab brought aeronautical thinking to car design until production ended in 2011. At the opposite extreme, Koenigsegg has since 1994 built extremely low-volume hypercars with an unusual amount of in-house component development.'),

('China', 'china', 'CN', '🇨🇳',
 'The largest car market and the largest EV producer in the world, with a battery supply chain that underpins much of the global industry.',
 'China''s modern industry was built through joint ventures with foreign makers from the 1980s, which transferred manufacturing capability at scale. State policy then targeted "new energy vehicles" directly, treating electrification as the opportunity to lead rather than follow. BYD, which began as a battery manufacturer in 1995, became the clearest expression of that strategy: its vertically integrated Blade LFP battery lets it control the most expensive part of an electric car, and it overtook Tesla in quarterly battery-electric sales in late 2023.')
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Categories
-- ---------------------------------------------------------------------------

insert into public.categories (name, slug, description, display_order) values
('Hypercar',     'hypercar',     'The extreme upper limit of road-car engineering, usually built in the dozens or low hundreds.', 1),
('Supercar',     'supercar',     'Mid-engined or high-output performance cars built in low volume, prioritising outright capability.', 2),
('Sports Car',   'sports-car',   'Driver-focused cars where balance, steering and response matter more than peak output.', 3),
('Sedan',        'sedan',        'Three-box saloon with a separate boot, the traditional mainstream body style.', 4),
('Coupe',        'coupe',        'Two-door fixed-roof body, usually with a lower roofline than the sedan it derives from.', 5),
('Convertible',  'convertible',  'Retractable soft or hard roof, accepting weight and rigidity penalties for open-air driving.', 6),
('SUV',          'suv',          'Raised ride height and a tall body on a road-biased platform.', 7),
('Off-Road',     'off-road',     'Genuine off-road capability: ladder frame or equivalent, low-range gearing, locking differentials.', 8),
('Hatchback',    'hatchback',    'Two-box body with a rear tailgate opening onto the passenger compartment.', 9),
('Wagon',        'wagon',        'Estate body extending the roofline to the tail for load capacity without a height penalty.', 10),
('MPV',          'mpv',          'Multi-purpose vehicle optimised for interior volume and flexible seating.', 11),
('Pickup',       'pickup',       'Separate open cargo bed behind the cabin, usually on a ladder frame.', 12),
('EV',           'ev',           'Cars whose defining characteristic is a purpose-built battery-electric platform.', 13)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Manufacturers
-- ---------------------------------------------------------------------------

insert into public.manufacturers (country_id, name, slug, founded_year, headquarters, segment, website, description)
select c.id, v.name, v.slug::public.slug, v.founded_year, v.headquarters,
       v.segment::public.manufacturer_segment, v.website, v.description
from (values
  ('india', 'Tata Motors', 'tata', 1945::smallint, 'Mumbai, Maharashtra', 'mass', 'https://www.tatamotors.com',
   'India''s largest automotive manufacturer by revenue and the producer of the Indica, the first passenger car designed and built in India. Tata owns Jaguar Land Rover and has become the leading domestic electric-car maker.'),
  ('india', 'Mahindra & Mahindra', 'mahindra', 1945::smallint, 'Mumbai, Maharashtra', 'mass', 'https://www.mahindra.com',
   'Began by assembling Willys Jeeps under licence in 1947, which shaped a lasting specialisation in rugged four-wheel-drive vehicles and SUVs. Now one of India''s largest utility-vehicle manufacturers.'),

  ('germany', 'BMW', 'bmw', 1916::smallint, 'Munich, Bavaria', 'luxury', 'https://www.bmw.com',
   'Founded as an aircraft engine manufacturer, hence the propeller motif in its roundel. BMW built its identity on the inline-six engine, rear-wheel drive and near-50:50 weight distribution; its M division has produced road-going motorsport derivatives since 1978.'),
  ('germany', 'Mercedes-Benz', 'mercedes-benz', 1926::smallint, 'Stuttgart, Baden-Württemberg', 'luxury', 'https://www.mercedes-benz.com',
   'Formed by the 1926 merger of Daimler-Motoren-Gesellschaft and Benz & Cie, the two companies that independently produced the first petrol automobiles in 1886. Historically the first to production-ise the crumple zone, anti-lock brakes and electronic stability control.'),
  ('germany', 'Porsche', 'porsche', 1931::smallint, 'Stuttgart-Zuffenhausen', 'performance', 'https://www.porsche.com',
   'Founded as a design consultancy by Ferdinand Porsche and building its own cars from 1948. The rear-engined 911 has remained in continuous production since 1964, developed rather than replaced across eight generations.'),
  ('germany', 'Audi', 'audi', 1909::smallint, 'Ingolstadt, Bavaria', 'luxury', 'https://www.audi.com',
   'The four rings represent the 1932 merger of Audi, DKW, Horch and Wanderer into Auto Union. Audi''s defining contribution is the quattro permanent four-wheel-drive system, introduced in 1980 and proven in rallying.'),

  ('italy', 'Ferrari', 'ferrari', 1939::smallint, 'Maranello, Emilia-Romagna', 'performance', 'https://www.ferrari.com',
   'Founded by Enzo Ferrari as Auto Avio Costruzioni, with the first car to carry the Ferrari name arriving in 1947. Road cars were conceived from the outset as a way of funding the racing team, and Scuderia Ferrari is the longest-serving constructor in Formula 1.'),
  ('italy', 'Lamborghini', 'lamborghini', 1963::smallint, 'Sant''Agata Bolognese, Emilia-Romagna', 'performance', 'https://www.lamborghini.com',
   'Established by tractor manufacturer Ferruccio Lamborghini as a direct competitor to Ferrari. The 1966 Miura established the mid-engined layout as the supercar norm, and the Countach set the wedge-shaped design language that defined the category for decades.'),

  ('japan', 'Toyota', 'toyota', 1937::smallint, 'Toyota City, Aichi', 'mass', 'https://www.toyota.com',
   'The world''s largest carmaker by volume for most of the past two decades. The Toyota Production System reshaped global manufacturing practice, and the 1997 Prius brought the hybrid powertrain to the mass market.'),
  ('japan', 'Honda', 'honda', 1948::smallint, 'Minato, Tokyo', 'mass', 'https://www.honda.com',
   'The world''s largest motorcycle manufacturer as well as a carmaker, with a strong engine-engineering culture. VTEC variable valve timing, introduced in 1989, let small naturally aspirated engines combine high specific output with everyday drivability.'),
  ('japan', 'Nissan', 'nissan', 1933::smallint, 'Yokohama, Kanagawa', 'mass', 'https://www.nissan-global.com',
   'Home of the Skyline GT-R lineage and its ATTESA E-TS four-wheel-drive system. The 2010 Leaf was the first mass-produced, mass-market battery-electric car.'),

  ('united-states', 'Ford', 'ford', 1903::smallint, 'Dearborn, Michigan', 'mass', 'https://www.ford.com',
   'Introduced the moving assembly line in 1913, cutting Model T build time from over twelve hours to about ninety minutes and making the car affordable to the people building it. The F-Series has been the best-selling vehicle in the United States for decades.'),
  ('united-states', 'Tesla', 'tesla', 2003::smallint, 'Austin, Texas', 'ev', 'https://www.tesla.com',
   'Built the case for electric cars on performance and software rather than efficiency alone. Its Supercharger network addressed the charging problem directly, and the Model 3 brought the approach to volume production.'),

  ('united-kingdom', 'McLaren', 'mclaren', 2010::smallint, 'Woking, Surrey', 'performance', 'https://www.mclaren.com',
   'McLaren Automotive was established in 2010 as a road-car manufacturer, drawing on a racing team founded in 1963. Every road car is built around a carbon-fibre monocoque, a technology McLaren first brought to Formula 1 in 1981.'),
  ('united-kingdom', 'Jaguar', 'jaguar', 1935::smallint, 'Coventry, West Midlands', 'luxury', 'https://www.jaguar.com',
   'Known for the E-Type and for five outright wins at Le Mans. Jaguar pioneered volume use of aluminium monocoque construction in the 2003 XJ, and the 2018 I-PACE was among the first credible premium electric SUVs.'),

  ('france', 'Renault', 'renault', 1899::smallint, 'Boulogne-Billancourt, Île-de-France', 'mass', 'https://www.renault.com',
   'One of the oldest surviving carmakers. Renault introduced the first turbocharged Formula 1 engine in 1977 and pioneered the modern MPV in Europe with the Espace in 1984.'),
  ('france', 'Peugeot', 'peugeot', 1810::smallint, 'Poissy, Île-de-France', 'mass', 'https://www.peugeot.com',
   'The Peugeot family business dates to 1810 and built its first petrol automobile in 1891, making it one of the oldest car marques in continuous existence. Now part of the Stellantis group.'),

  ('south-korea', 'Hyundai', 'hyundai', 1967::smallint, 'Seoul', 'mass', 'https://www.hyundai.com',
   'Produced its first independently developed car, the Pony, in 1975. The dedicated E-GMP electric platform introduced in 2021 uses an 800-volt architecture that allows very high charging rates.'),
  ('south-korea', 'Kia', 'kia', 1944::smallint, 'Seoul', 'mass', 'https://www.kia.com',
   'Began as a manufacturer of bicycle parts and steel tubing before moving into vehicles. Now part of the Hyundai Motor Group, sharing the E-GMP platform while maintaining a distinct design direction.'),

  ('sweden', 'Koenigsegg', 'koenigsegg', 1994::smallint, 'Ängelholm, Skåne', 'performance', 'https://www.koenigsegg.com',
   'An extremely low-volume hypercar manufacturer notable for developing an unusual share of its own technology in-house, including the Freevalve camless engine, the Light Speed Transmission and its own carbon-fibre wheels.'),
  ('sweden', 'Volvo Cars', 'volvo', 1927::smallint, 'Gothenburg, Västra Götaland', 'luxury', 'https://www.volvocars.com',
   'Founded on the principle that safety comes first. Volvo engineer Nils Bohlin designed the three-point seatbelt in 1959, and the company released the patent for free use by any manufacturer.'),

  ('china', 'BYD', 'byd', 2003::smallint, 'Shenzhen, Guangdong', 'ev', 'https://www.byd.com',
   'BYD Auto was established in 2003 by a battery manufacturer founded in 1995, and that origin remains its main advantage: the vertically integrated Blade LFP battery lets it control the most expensive component in an electric car.')
) as v(country_slug, name, slug, founded_year, headquarters, segment, website, description)
join public.countries c on c.slug = v.country_slug
on conflict (slug) do nothing;
-- ---------------------------------------------------------------------------
-- Engines (combustion only; electric drive is modelled via ev_specs)
--
-- compression_ratio and redline_rpm are frequently unpublished or vary by
-- market tune, so they are NULL unless well established.
-- ---------------------------------------------------------------------------

insert into public.engines (name, layout, cylinders, displacement_cc, aspiration, fuel_system, compression_ratio, redline_rpm, cooling, valves_per_cylinder, source, notes) values
('Porsche 9A2 Evo 3.0 Twin-Turbo Flat-6', 'flat', 6, 2981, 'twin_turbo', 'Direct injection', 10.50, 7500, 'Water-cooled', 4, 'Porsche published specifications', null),
('Porsche 4.0 Naturally Aspirated Flat-6', 'flat', 6, 3996, 'naturally_aspirated', 'Direct injection', 13.30, 9000, 'Water-cooled', 4, 'Porsche published specifications', 'GT3 unit; rigid valve train with finger followers allows the 9,000 rpm limit.'),
('BMW S58 3.0 Twin-Turbo Inline-6', 'inline', 6, 2993, 'twin_turbo', 'Direct injection', 9.30, 7200, 'Water-cooled', 4, 'BMW M published specifications', 'Closed-deck block, forged crankshaft, 3D-printed cylinder head core.'),
('BMW B58 3.0 Turbo Inline-6', 'inline', 6, 2998, 'turbocharged', 'Direct injection', 11.00, null, 'Water-cooled', 4, 'BMW published specifications', 'Also supplied to Toyota for the A90 Supra.'),
('Mercedes-AMG M177 4.0 V8 Biturbo', 'vee', 8, 3982, 'twin_turbo', 'Direct injection', 10.50, null, 'Water-cooled', 4, 'Mercedes-AMG published specifications', 'Turbochargers sit inside the V, shortening gas paths and reducing lag.'),
('Audi EA825 4.0 V8 TFSI Biturbo', 'vee', 8, 3996, 'twin_turbo', 'Direct injection', 10.60, null, 'Water-cooled', 4, 'Audi published specifications', null),
('Audi 5.2 FSI V10', 'vee', 10, 5204, 'naturally_aspirated', 'Direct and port injection', 12.70, 8700, 'Water-cooled', 4, 'Audi published specifications', 'Shared with the Lamborghini Huracán.'),
('Ferrari F163 3.0 V6 Turbo', 'vee', 6, 2992, 'twin_turbo', 'Direct injection', 9.40, 8500, 'Water-cooled', 4, 'Ferrari published specifications', '120-degree V angle with turbochargers mounted inside the vee.'),
('Ferrari F154 3.9 V8 Turbo', 'vee', 8, 3902, 'twin_turbo', 'Direct injection', 9.60, 8000, 'Water-cooled', 4, 'Ferrari published specifications', null),
('Ferrari F154FA 4.0 V8 Turbo', 'vee', 8, 3990, 'twin_turbo', 'Direct injection', 9.50, 8000, 'Water-cooled', 4, 'Ferrari published specifications', 'SF90 Stradale unit, mounted lower in the chassis than earlier F154 variants.'),
('Lamborghini 5.2 V10', 'vee', 10, 5204, 'naturally_aspirated', 'Direct and port injection', 12.70, 8500, 'Water-cooled', 4, 'Lamborghini published specifications', null),
('Lamborghini L545 6.5 V12', 'vee', 12, 6498, 'naturally_aspirated', 'Direct injection', 12.60, 9500, 'Water-cooled', 4, 'Lamborghini published specifications', 'Revuelto unit; an all-new design rather than a development of the Aventador V12.'),
('Audi/Lamborghini 4.0 V8 Biturbo (Urus)', 'vee', 8, 3996, 'twin_turbo', 'Direct injection', 9.70, null, 'Water-cooled', 4, 'Lamborghini published specifications', null),
('Honda K20C1 2.0 Turbo Inline-4', 'inline', 4, 1996, 'turbocharged', 'Direct injection', 9.80, 7000, 'Water-cooled', 4, 'Honda published specifications', null),
('Nissan VR38DETT 3.8 V6 Twin-Turbo', 'vee', 6, 3799, 'twin_turbo', 'Direct injection', 9.00, 7000, 'Water-cooled', 4, 'Nissan published specifications', 'Each engine hand-assembled by a single Takumi technician.'),
('Ford Coyote 5.0 V8', 'vee', 8, 5038, 'naturally_aspirated', 'Direct and port injection', 12.00, 7500, 'Water-cooled', 4, 'Ford published specifications', null),
('Ford 3.5 EcoBoost V6', 'vee', 6, 3496, 'twin_turbo', 'Direct and port injection', 10.50, null, 'Water-cooled', 4, 'Ford published specifications', null),
('McLaren M840T 4.0 V8 Twin-Turbo', 'vee', 8, 3994, 'twin_turbo', 'Direct injection', 9.40, 8500, 'Water-cooled', 4, 'McLaren published specifications', null),
('McLaren M630 3.0 V6 Twin-Turbo', 'vee', 6, 2993, 'twin_turbo', 'Direct injection', null, 8500, 'Water-cooled', 4, 'McLaren published specifications', '120-degree V angle, designed for hybrid integration in the Artura.'),
('Jaguar AJ133 5.0 V8 Supercharged', 'vee', 8, 5000, 'supercharged', 'Direct injection', 9.50, 6500, 'Water-cooled', 4, 'Jaguar published specifications', 'Roots-type twin-vortex supercharger.'),
('Koenigsegg 5.0 V8 Twin-Turbo (Jesko)', 'vee', 8, 5065, 'twin_turbo', 'Direct and port injection', null, 8500, 'Water-cooled', 4, 'Koenigsegg published specifications', 'Flat-plane crankshaft; output depends on fuel — see variant notes.'),
('Toyota 2ZR-FXE 1.8 Hybrid Inline-4', 'inline', 4, 1798, 'naturally_aspirated', 'Port and direct injection', 13.00, null, 'Water-cooled', 4, 'Toyota published specifications', 'Atkinson-cycle operation trades peak power for thermal efficiency.'),
('Tata Revotorq 1.5 Diesel Inline-4', 'inline', 4, 1497, 'turbocharged', 'Common-rail direct injection', null, null, 'Water-cooled', 4, 'Tata Motors published specifications', null),
('Tata Kryotec 2.0 Diesel Inline-4', 'inline', 4, 1956, 'turbocharged', 'Common-rail direct injection', null, null, 'Water-cooled', 4, 'Tata Motors published specifications', null),
('Mahindra mHawk 2.2 Diesel Inline-4', 'inline', 4, 2184, 'turbocharged', 'Common-rail direct injection', null, null, 'Water-cooled', 4, 'Mahindra published specifications', null),
('Mahindra mStallion 2.0 Turbo Inline-4', 'inline', 4, 1997, 'turbocharged', 'Direct injection', null, null, 'Water-cooled', 4, 'Mahindra published specifications', null),
('Hyundai Smartstream 1.5 Turbo Inline-4', 'inline', 4, 1482, 'turbocharged', 'Direct injection', null, null, 'Water-cooled', 4, 'Hyundai published specifications', null),
('Volvo B420 2.0 Turbo Inline-4 (T8)', 'inline', 4, 1969, 'turbocharged', 'Direct injection', null, null, 'Water-cooled', 4, 'Volvo Cars published specifications', 'Petrol element of the T8 plug-in hybrid powertrain.'),
('Renault TCe 1.3 Turbo Inline-4', 'inline', 4, 1333, 'turbocharged', 'Direct injection', null, null, 'Water-cooled', 4, 'Renault published specifications', 'Co-developed with Mercedes-Benz.'),
('Peugeot PureTech 1.2 Turbo Inline-3', 'inline', 3, 1199, 'turbocharged', 'Direct injection', null, null, 'Water-cooled', 4, 'Peugeot published specifications', null)
on conflict (name) do nothing;

-- ---------------------------------------------------------------------------
-- Transmissions
-- ---------------------------------------------------------------------------

insert into public.transmissions (name, type, gears, notes) values
('Porsche 8-speed PDK', 'dct', 8, 'Doppelkupplungsgetriebe: two clutches, odd and even gear sets, pre-selected shifts.'),
('Porsche 7-speed manual', 'manual', 7, null),
('Porsche 6-speed GT manual', 'manual', 6, 'Shorter ratios than the 7-speed, offered on GT models.'),
('ZF 8HP 8-speed automatic', 'automatic', 8, 'Torque-converter automatic used under licence across many manufacturers.'),
('BMW M Steptronic 8-speed', 'automatic', 8, 'ZF 8HP with M-specific calibration and a reinforced torque converter.'),
('BMW 6-speed manual', 'manual', 6, null),
('Mercedes-AMG SPEEDSHIFT MCT 9G', 'automatic', 9, 'Wet start-off clutch replaces the torque converter to cut inertia.'),
('Ferrari 8-speed DCT', 'dct', 8, null),
('Ferrari 7-speed DCT', 'dct', 7, null),
('Lamborghini 7-speed LDF DCT', 'dct', 7, null),
('Lamborghini 8-speed DCT', 'dct', 8, null),
('Audi 7-speed S tronic', 'dct', 7, null),
('Audi 8-speed tiptronic', 'automatic', 8, null),
('Honda 6-speed manual', 'manual', 6, 'Rev-matching on downshifts; short throw and a low-inertia flywheel.'),
('Nissan GR6 6-speed DCT', 'dct', 6, 'Rear-mounted transaxle, contributing to front/rear weight balance.'),
('Ford 10-speed automatic', 'automatic', 10, 'Co-developed with General Motors.'),
('Ford 6-speed manual', 'manual', 6, null),
('McLaren 7-speed SSG', 'dct', 7, 'Seamless Shift Gearbox.'),
('McLaren 8-speed SSG', 'dct', 8, null),
('Jaguar 8-speed Quickshift automatic', 'automatic', 8, null),
('Koenigsegg Light Speed Transmission 9-speed', 'dct', 9, 'Multi-clutch design with no synchronisers, able to shift to any gear directly rather than sequentially.'),
('Toyota e-CVT (Hybrid Synergy Drive)', 'cvt', null, 'A power-split planetary device rather than a belt CVT; it has no fixed gear count, so gears is NULL.'),
('Single-speed reduction gear', 'single_speed', 1, 'Standard for battery-electric drive: the motor''s torque curve removes the need for ratios.'),
('6-speed manual', 'manual', 6, null),
('6-speed automatic', 'automatic', 6, null),
('7-speed DCT', 'dct', 7, null),
('8-speed automatic', 'automatic', 8, null),
('5-speed AMT', 'amt', 5, 'Automated manual: a conventional manual gearbox with actuated clutch and shift.'),
('CVT', 'cvt', null, 'Belt-and-pulley continuously variable transmission.')
on conflict (name) do nothing;

-- ---------------------------------------------------------------------------
-- Part categories
-- ---------------------------------------------------------------------------

insert into public.part_categories (name, slug, description, display_order) values
('Exterior',   'exterior',   'Body panels, glazing and aerodynamic surfaces.', 1),
('Engine',     'engine',     'The internal combustion engine and its supporting systems.', 2),
('Drivetrain', 'drivetrain', 'Everything that carries torque from the engine or motor to the road.', 3),
('Suspension', 'suspension', 'Components that control wheel movement and body attitude.', 4),
('Braking',    'braking',    'Systems that convert kinetic energy into heat to slow the car.', 5),
('Wheels',     'wheels',     'Wheels, tyres and the hardware that mounts them.', 6),
('Interior',   'interior',   'Cabin structure, controls and occupant protection.', 7),
('Electrical', 'electrical', 'Power generation, distribution and electronic control.', 8),
('EV Systems', 'ev-systems', 'High-voltage components specific to electrified powertrains.', 9)
on conflict (slug) do nothing;
-- ---------------------------------------------------------------------------
-- Parts encyclopedia
--
-- These descriptions are general engineering facts rather than model-specific
-- figures, so they can be detailed without violating the data-honesty rule.
-- viewer_group maps each part to a named group of the procedural 3D car.
-- ---------------------------------------------------------------------------

insert into public.parts (category_id, name, slug, viewer_group, description, "function", typical_materials, location, common_failure_points, performance_impact, display_order)
select pc.id, v.name, v.slug::public.slug, v.viewer_group::public.viewer_group,
       v.description, v."function", v.typical_materials, v.location,
       v.common_failure_points, v.performance_impact, v.display_order
from (values

-- === Exterior ==============================================================
('exterior', 'Bonnet', 'bonnet', 'body', 1::smallint,
 'The hinged panel covering the engine bay or front luggage compartment. On performance cars it is often vented to extract high-pressure air from the engine bay, which reduces front-end lift as well as heat.',
 'Provides access to the engine bay while contributing to the body''s aerodynamic form and, in a frontal impact, deforming in a controlled way rather than intruding into the cabin.',
 'Pressed steel on mass-market cars; aluminium where weight over the front axle matters; carbon-fibre composite on performance models.',
 'Front of the vehicle, hinged at the base of the windscreen or, less commonly, at the front edge.',
 'Latch and release-cable corrosion or seizure; hinge wear causing panel misalignment; stone chipping along the leading edge.',
 'Material choice directly affects weight distribution. Replacing a steel bonnet with carbon-fibre removes mass from the highest and most forward point of the car, which improves both the centre of gravity and turn-in response.', 1),

('exterior', 'Front Bumper', 'front-bumper', 'body', 2::smallint,
 'The structural and cosmetic assembly at the front of the car. The visible moulding conceals a reinforcement beam and energy-absorbing foam or crush cans that manage low-speed impacts.',
 'Absorbs impact energy in low-speed collisions to protect the more expensive structure behind it, and shapes the airflow entering the radiators and brake ducts.',
 'Thermoplastic outer moulding over an aluminium or high-strength-steel reinforcement beam with polypropylene foam absorbers.',
 'Front of the vehicle, mounted to the chassis rails.',
 'Cracking of the moulding from kerb strikes; failure of the plastic clips and tabs that locate it; damage to parking sensors and radar modules mounted within it.',
 'The bumper''s lower edge and splitter govern how much air passes under the car. A lower, more aggressive profile reduces front lift but also reduces ground clearance and cooling airflow.', 2),

('exterior', 'Fender', 'fender', 'body', 3::smallint,
 'The panel surrounding the wheel arch. Its shape must clear the wheel through full suspension travel and steering lock while containing the spray thrown up by the tyre.',
 'Encloses the wheel well, prevents road debris and water being thrown onto the body and other vehicles, and forms part of the car''s external surface.',
 'Pressed steel, aluminium, or composite; some cars use plastic fenders that resist minor parking damage.',
 'Above and around each wheel arch.',
 'Corrosion from trapped road salt in the arch liner; cracking near mounting points; damage from tyre contact when suspension is lowered excessively.',
 'Fender venting behind the front wheels releases the high-pressure air that builds up in the arch, reducing lift and drag. Widened fenders allow a broader track, which increases cornering stability.', 3),

('exterior', 'Windscreen', 'windscreen', 'body', 4::smallint,
 'The front window, made from laminated glass: two glass layers bonded to a polyvinyl butyral interlayer that holds fragments in place when the glass breaks.',
 'Provides forward visibility while acting as a structural member that contributes significantly to roof-crush resistance and prevents occupant ejection.',
 'Laminated soda-lime glass with a PVB interlayer; often with infrared-reflective or acoustic layers.',
 'Front of the cabin, bonded to the A-pillars and cowl with structural urethane adhesive.',
 'Stone chips propagating into cracks under thermal stress; delamination at the edges in older glass; failure of the urethane bond if replaced without proper surface preparation.',
 'Windscreen rake is one of the largest single contributors to aerodynamic drag. A steeper rake lowers the drag coefficient but reduces headroom and increases the glazed area that must be shaded.', 4),

('exterior', 'Rear Spoiler', 'rear-spoiler', 'body', 5::smallint,
 'A surface at the trailing edge of the body that modifies airflow separation. A spoiler "spoils" unfavourable flow; a wing, by contrast, generates downforce by acting as an inverted aerofoil.',
 'Reduces rear lift at speed and stabilises the wake behind the car, improving high-speed straight-line stability.',
 'Injection-moulded plastic, aluminium, or carbon-fibre composite; active systems add electric actuators.',
 'Rear edge of the boot lid or roof.',
 'Actuator motor or linkage failure on deployable spoilers; degradation of mounting seals allowing water ingress into the boot.',
 'Increases rear downforce and therefore rear grip, at the cost of drag and top speed. Active spoilers resolve that trade-off by retracting on straights and deploying under braking, where they can also act as an airbrake.', 5),

('exterior', 'Rear Diffuser', 'rear-diffuser', 'body', 6::smallint,
 'An upswept section of the underbody at the rear of the car. It expands the airflow leaving the flat floor, decelerating it and recovering pressure back toward ambient.',
 'Accelerates air under the floor, which lowers pressure beneath the car and generates downforce without the drag penalty of a wing.',
 'Carbon-fibre composite or moulded plastic, sometimes with vertical strakes to organise the flow.',
 'Underside of the car, behind the rear axle.',
 'Kerb and speed-bump damage; loss of strakes; mounting-point cracking.',
 'One of the most efficient downforce devices available, because it produces grip primarily by managing pressure rather than by obstructing airflow. Its effectiveness depends heavily on a flat, sealed underbody ahead of it.', 6),

('exterior', 'Side Mirror', 'side-mirror', 'body', 7::smallint,
 'The exterior rear-view mirror assembly, typically incorporating powered adjustment, heating, and increasingly indicator repeaters and blind-spot warning sensors.',
 'Provides rearward and lateral visibility into the areas not covered by the interior mirror.',
 'Plastic housing, glass mirror element, electric actuator motors.',
 'Mounted on the door or the A-pillar base on each side.',
 'Folding-mechanism motor failure; heating-element failure; housing damage from narrow passing clearances.',
 'Mirrors are a disproportionate source of aerodynamic drag and wind noise for their size, because they sit in fast-moving air outside the body''s boundary layer. Camera-based replacements can cut drag measurably where regulations permit them.', 7),

('exterior', 'Door', 'door', 'body', 8::smallint,
 'The hinged or otherwise articulated closure providing cabin access. Modern doors contain a side-impact beam, the window regulator, speakers, wiring and often side airbags.',
 'Provides access to the cabin, seals it against water and noise, and transfers side-impact loads into the sills and pillars.',
 'Steel or aluminium outer skin over a stamped inner frame, with a high-strength steel or aluminium intrusion beam.',
 'Both sides of the cabin.',
 'Hinge and check-strap wear causing drop or misalignment; drain-hole blockage leading to internal corrosion; window regulator cable failure.',
 'Doors carry substantial mass high in the structure. Aluminium or composite doors are a common weight-reduction target on performance cars, and exotic opening arrangements are usually driven by packaging around wide sills rather than by style alone.', 8),

-- === Engine ================================================================
('engine', 'Cylinder Block', 'cylinder-block', 'engine', 1::smallint,
 'The main structural casting of the engine, containing the cylinder bores and forming the upper half of the crankcase. Everything else in the engine mounts to it.',
 'Houses the pistons as they travel in their bores, supports the crankshaft main bearings, and carries coolant and oil galleries through its walls.',
 'Cast iron for strength and cheapness; aluminium alloy with iron liners or plasma-sprayed bores where weight matters.',
 'The core of the engine, below the cylinder head.',
 'Bore wear and scoring; head-gasket surface distortion from overheating; cracking between bores or into water jackets after severe thermal cycling.',
 'Block rigidity determines how much cylinder pressure the engine can tolerate. Closed-deck designs, which fully support the top of the bores, are a standard prerequisite for high-boost forced induction.', 1),

('engine', 'Cylinder Head', 'cylinder-head', 'engine', 2::smallint,
 'The casting that seals the top of the cylinders and contains the combustion chambers, valves, ports and usually the camshafts.',
 'Forms the combustion chamber, routes intake and exhaust gas through its ports, and carries the valve train that controls gas exchange.',
 'Cast aluminium alloy almost universally in modern engines, for heat rejection and weight.',
 'Bolted to the top of the cylinder block, sealed by the head gasket.',
 'Warping from overheating; cracking between valve seats; valve-guide and valve-seat wear; camshaft journal wear where oil supply is marginal.',
 'Port shape and valve area set the engine''s breathing capability, which is the primary limit on power at high rpm. This is why cylinder-head design receives disproportionate development effort on performance engines.', 2),

('engine', 'Piston', 'piston', 'engine', 3::smallint,
 'The cylindrical component that transfers the force of combustion to the connecting rod. Its crown shape is designed alongside the combustion chamber to control flame propagation and, in direct-injection engines, fuel targeting.',
 'Seals the combustion chamber via its rings and converts the pressure of expanding gases into linear motion.',
 'Cast or forged aluminium alloy; forged pistons are stronger and more tolerant of detonation but expand more, requiring greater cold clearance.',
 'Inside each cylinder bore.',
 'Ring-land cracking and crown erosion from detonation; skirt scuffing from inadequate lubrication or overheating; ring wear causing oil consumption and blow-by.',
 'Piston mass is reciprocating mass, so it directly limits safe engine speed. Lighter pistons allow a higher rev ceiling, which raises peak power for a given torque output.', 3),

('engine', 'Connecting Rod', 'connecting-rod', 'engine', 4::smallint,
 'The link between piston and crankshaft, converting the piston''s linear travel into crankshaft rotation. It endures alternating compression and tension at very high frequency.',
 'Transfers combustion force to the crankshaft while accommodating the changing angle between piston and crank throw.',
 'Forged steel in most production engines; titanium in high-output and racing applications; powder-forged for cost-effective strength.',
 'Between each piston and its crankshaft journal.',
 'Big-end bearing failure from oil starvation; rod-bolt fatigue, which is the usual root cause of a thrown rod; buckling under extreme cylinder pressure.',
 'Rod-bolt strength, more than the rod itself, typically defines an engine''s safe rpm limit. Lighter rods reduce reciprocating mass and let the engine rev higher.', 4),

('engine', 'Crankshaft', 'crankshaft', 'engine', 5::smallint,
 'The rotating shaft that collects the force from every connecting rod and delivers a single rotational output. Its offset throws set the stroke, and counterweights balance the reciprocating assembly.',
 'Converts the reciprocating motion of the pistons into the rotation that drives the transmission.',
 'Cast iron for ordinary engines; forged steel for high-output applications, occasionally billet-machined for racing.',
 'Along the base of the engine, supported in the main bearings of the block.',
 'Main and big-end bearing wear; journal scoring from contaminated oil; torsional fatigue cracking at the fillets where journals meet webs.',
 'The crank throw sets the stroke and therefore the bore-to-stroke ratio. Short-stroke engines tolerate higher rpm because mean piston speed is lower, which is why high-revving performance engines are almost always oversquare.', 5),

('engine', 'Camshaft', 'camshaft', 'engine', 6::smallint,
 'The shaft whose lobes open the valves in a precise sequence and for a precise duration, driven from the crankshaft at exactly half engine speed in a four-stroke engine.',
 'Controls when each valve opens, how far it lifts and how long it stays open — collectively the engine''s valve timing.',
 'Chilled cast iron or forged and hardened steel; assembled camshafts with pressed-on lobes reduce weight.',
 'In the cylinder head on modern overhead-cam engines; in the block on pushrod designs.',
 'Lobe wear and pitting where oil supply is poor; timing-chain or belt stretch shifting the timing; variable-timing phaser failure.',
 'Lobe profile is the single strongest determinant of an engine''s power character. More duration and lift move the powerband upward at the expense of low-speed torque and idle quality, which is exactly the trade-off variable valve timing exists to avoid.', 6),

('engine', 'Valve', 'valve', 'engine', 7::smallint,
 'The poppet valves that open and close the intake and exhaust ports. Exhaust valves run far hotter than intake valves, which is why they often use different alloys or sodium-filled stems for internal heat transfer.',
 'Admit the air or air-fuel charge into the cylinder and release the burnt gases, sealing the combustion chamber the rest of the time.',
 'Martensitic or austenitic stainless steel; Inconel or titanium for high-performance exhaust and intake valves respectively.',
 'In the cylinder head, seating against machined valve seats.',
 'Seat recession and burning, particularly on exhaust valves; stem wear; valve float at high rpm when spring pressure cannot follow the cam profile.',
 'Total valve area limits how much air the engine can move, capping peak power. Four valves per cylinder became standard because two smaller valves offer more area and less mass than one large one.', 7),

('engine', 'Turbocharger', 'turbocharger', 'engine', 8::smallint,
 'An exhaust-driven compressor. A turbine in the exhaust stream spins a shared shaft that drives a compressor wheel in the intake, forcing more air into the engine than atmospheric pressure alone would supply.',
 'Increases the mass of air in each cylinder, allowing proportionally more fuel to be burnt and more power produced from a given displacement.',
 'Nickel-based superalloy turbine wheel, aluminium compressor wheel, cast-iron or stainless turbine housing, with floating or ball bearings.',
 'Mounted to the exhaust manifold, or inside the vee on some V-configuration engines.',
 'Bearing failure from oil coking after hot shutdown; shaft-play leading to wheel contact; wastegate actuator and variable-geometry vane sticking.',
 'Recovers energy that would otherwise leave as exhaust heat, so it improves both power and efficiency. The cost is lag — the delay while exhaust energy spins the turbine up — which twin-scroll housings, smaller turbines and electric assistance all exist to reduce.', 8),

('engine', 'Supercharger', 'supercharger', 'engine', 9::smallint,
 'A compressor driven mechanically from the crankshaft rather than by exhaust gas. Roots and twin-screw types are positive-displacement; centrifugal types behave more like a belt-driven turbocharger.',
 'Forces additional air into the engine, with boost pressure tied directly to engine speed.',
 'Aluminium housing with steel or composite rotors, often with an integrated intercooler in the intake manifold.',
 'Usually mounted in the engine vee or above the intake manifold, belt-driven from the crankshaft.',
 'Bearing and rotor-coating wear; drive-belt slip; intercooler pump failure on water-to-air systems.',
 'Delivers boost essentially instantly and proportionally to engine speed, giving a very linear response. It is less efficient than a turbocharger overall, because it consumes crankshaft power rather than recovering waste heat.', 9),

('engine', 'Intercooler', 'intercooler', 'engine', 10::smallint,
 'A heat exchanger that cools the charge air after compression. Compressing air heats it substantially, and hot air is less dense — which undoes part of the benefit of forcing it in.',
 'Lowers intake-charge temperature to increase its density and reduce the engine''s tendency to detonate.',
 'Aluminium bar-and-plate or tube-and-fin cores; air-to-air or water-to-air configurations.',
 'Behind the front bumper for air-to-air units; mounted on or near the intake manifold for water-to-air units.',
 'Stone damage to the core; internal oil fouling from crankcase ventilation; end-tank cracking and boost-pipe coupling failure.',
 'Directly increases power by restoring charge density, and raises the detonation threshold so more ignition advance or boost can be used. Water-to-air units respond faster to transient load but add pump, radiator and coolant mass.', 10),

('engine', 'Fuel Injector', 'fuel-injector', 'engine', 11::smallint,
 'A solenoid or piezo-actuated valve that meters fuel into the intake port or directly into the cylinder. Direct injection operates at pressures orders of magnitude above port injection.',
 'Delivers a precisely metered, finely atomised quantity of fuel with timing controlled to within fractions of a crankshaft degree.',
 'Hardened steel body with a multi-hole nozzle; piezo stacks in high-end direct-injection systems.',
 'In the intake port, or through the cylinder head into the combustion chamber.',
 'Nozzle coking on direct-injection engines; solenoid failure; leakage causing bore washing and fuel dilution of the oil.',
 'Spray pattern and timing control mixture preparation, which governs combustion stability, emissions and knock resistance. Direct injection also cools the charge as the fuel evaporates in-cylinder, permitting higher compression ratios.', 11),

('engine', 'Throttle Body', 'throttle-body', 'engine', 12::smallint,
 'The valve controlling airflow into the engine. Almost universally electronic now, with the pedal acting as a request that the ECU interprets rather than a direct mechanical link.',
 'Regulates the mass of air entering the intake manifold, which is the primary means of controlling engine load in a petrol engine.',
 'Cast aluminium housing with an aluminium butterfly plate and an electric actuator motor.',
 'Between the intake ducting and the intake manifold.',
 'Carbon build-up around the plate causing unstable idle; position-sensor drift; actuator motor failure.',
 'Throttle-body diameter caps peak airflow, but an oversized one hurts low-speed throttle resolution. Electronic control allows traction control, stability control and cruise control to intervene directly in engine output.', 12),

('engine', 'Oil Pump', 'oil-pump', 'engine', 13::smallint,
 'The pump that circulates oil under pressure through the engine''s galleries. Variable-displacement designs reduce the parasitic power lost to pumping when full flow is not needed.',
 'Maintains a pressurised oil film in every bearing, and circulates oil for cooling and for cleaning debris into the filter.',
 'Cast or sintered steel gears or rotors in an aluminium housing.',
 'Usually at the base of the engine, driven from the crankshaft, drawing from the sump through a pickup.',
 'Pickup-screen blockage from sludge; rotor wear reducing pressure; pressure-relief valve sticking.',
 'Oil supply is the hard limit on sustained high-load operation. Cars driven on track frequently adopt dry-sump systems, because sustained lateral acceleration can move oil away from a wet-sump pickup and starve the bearings.', 13),

('engine', 'Radiator', 'radiator', 'engine', 14::smallint,
 'The main coolant-to-air heat exchanger. Roughly a third of the fuel energy an engine consumes leaves as heat through the cooling system.',
 'Rejects engine heat to the atmosphere, keeping coolant within the narrow band where the engine is efficient but not damaged.',
 'Aluminium core with plastic or aluminium end tanks.',
 'At the front of the engine bay, behind the bumper aperture.',
 'Corrosion and internal scaling; plastic end-tank cracking with age and thermal cycling; fin damage from debris.',
 'Insufficient cooling capacity forces the ECU to retard timing and enrich mixture to protect the engine, which cuts power exactly when it is being used hardest. This is why track-focused cars carry oversized or supplementary radiators.', 14),

('engine', 'Exhaust Manifold', 'exhaust-manifold', 'engine', 15::smallint,
 'Collects exhaust gas from each cylinder into a single stream. Tubular headers with equal-length primaries use the pressure waves from each pulse to help scavenge the next cylinder.',
 'Routes exhaust gas from the cylinder head to the turbocharger or exhaust system while managing pulse interference between cylinders.',
 'Cast iron for durability and cost; stainless steel tubular headers for performance; Inconel where temperatures are extreme.',
 'Bolted to the exhaust ports of the cylinder head.',
 'Cracking from thermal cycling, particularly at weld joints; stud shearing; gasket failure.',
 'Primary length and collector design tune the engine''s torque curve by timing the scavenging pulses. Longer primaries favour low-end torque, shorter ones favour top-end power.', 15),

('engine', 'Catalytic Converter', 'catalytic-converter', 'engine', 16::smallint,
 'An emissions device containing a ceramic honeycomb coated with platinum, palladium and rhodium. A three-way catalyst oxidises carbon monoxide and hydrocarbons while reducing oxides of nitrogen.',
 'Converts the three main regulated pollutants into carbon dioxide, water and nitrogen before they leave the exhaust.',
 'Cordierite ceramic or metallic substrate with a precious-metal washcoat in a stainless steel shell.',
 'In the exhaust system, positioned close to the engine so it reaches operating temperature quickly.',
 'Substrate melting from unburnt fuel; poisoning by oil or coolant contamination; physical breakage of the ceramic from impact or thermal shock.',
 'Introduces exhaust back-pressure, which costs a small amount of power. It only functions above roughly 250 °C, which is why close-coupled positioning and electrically heated catalysts are used to cut cold-start emissions.', 16),

-- === Drivetrain ============================================================
('drivetrain', 'Clutch', 'clutch', 'transmission', 1::smallint,
 'A friction coupling that connects and disconnects engine and gearbox. The pressure plate clamps the friction disc against the flywheel; releasing it interrupts torque so a gear can be selected.',
 'Allows the engine to remain running while the car is stationary, and permits smooth, progressive engagement when moving off.',
 'Organic, ceramic or sintered friction material on a steel disc, with a sprung steel diaphragm pressure plate.',
 'Between the engine flywheel and the gearbox input shaft.',
 'Friction-material wear; diaphragm-spring fatigue; release-bearing noise and failure; judder from oil contamination or a warped flywheel.',
 'Clamp load sets the torque the clutch can hold. Lightweight flywheels reduce rotational inertia so the engine revs more freely, at the cost of low-speed smoothness and greater driveline shock.', 1),

('drivetrain', 'Manual Gearbox', 'manual-gearbox', 'transmission', 2::smallint,
 'A gearset offering several fixed ratios, selected by the driver. Synchroniser rings match the speed of the gear to the shaft before the dog teeth engage, which is what makes a modern manual shift smoothly.',
 'Multiplies engine torque and matches engine speed to road speed across the car''s operating range.',
 'Case-hardened steel gears in an aluminium casing, with brass or carbon-lined synchroniser rings.',
 'Behind the engine in a front-engine layout, or combined with the differential as a transaxle.',
 'Synchroniser wear causing crunching on shifts; bearing noise; shift-linkage bushing wear producing a vague action.',
 'Ratio spacing determines how well the engine is kept in its powerband. Closer ratios suit narrow, high-revving powerbands; wider ratios suit torquey engines and favour economy.', 2),

('drivetrain', 'Dual-Clutch Transmission', 'dual-clutch-transmission', 'transmission', 3::smallint,
 'Effectively two manual gearboxes in one housing: one clutch serves the odd gears and the other the even gears, so the next ratio is already engaged and waiting before the shift begins.',
 'Delivers very fast gear changes with almost no interruption in torque, by handing over from one clutch to the other.',
 'Steel gearsets with wet multi-plate or dry clutches, in an aluminium housing with an electro-hydraulic control unit.',
 'In place of a conventional gearbox or transaxle.',
 'Mechatronic control unit faults; clutch-pack wear, particularly from prolonged low-speed crawling; overheating in stop-start traffic.',
 'Shift times well under 100 milliseconds with minimal torque interruption make it measurably faster than a manual and usually faster than a torque-converter automatic. The penalty is weight, complexity and less refined low-speed behaviour.', 3),

('drivetrain', 'Torque Converter', 'torque-converter', 'transmission', 4::smallint,
 'A fluid coupling connecting engine to automatic gearbox. An impeller drives fluid against a turbine, and a stator redirects the returning flow so that torque is multiplied at low speed.',
 'Transmits drive without a mechanical connection, allowing the car to idle in gear, and multiplies torque when moving off.',
 'Stamped and welded steel housing containing the impeller, turbine and stator, with a lock-up clutch.',
 'Between the engine and an automatic transmission.',
 'Lock-up clutch shudder; stator one-way clutch failure; fluid degradation from overheating.',
 'Torque multiplication gives strong, smooth take-off — which is why torque-converter automatics remain competitive for outright acceleration. The lock-up clutch eliminates slip at cruise so efficiency no longer suffers as it once did.', 4),

('drivetrain', 'Driveshaft', 'driveshaft', 'transmission', 5::smallint,
 'The shaft carrying torque from the gearbox to the differential. Long shafts are often made in two pieces with a centre bearing, to keep the critical whirl speed above the operating range.',
 'Transmits rotation along the length of the car while accommodating suspension movement through universal joints.',
 'Steel or aluminium tube; carbon-fibre where rotational inertia and weight matter.',
 'Along the centre tunnel, between gearbox and rear differential.',
 'Universal-joint wear causing vibration; centre-bearing rubber perishing; imbalance after a lost balance weight.',
 'Reducing rotating mass improves throttle response measurably, because the whole driveline must be accelerated along with the car. Carbon-fibre shafts also fail benignly by shredding rather than whipping.', 5),

('drivetrain', 'Differential', 'differential', 'transmission', 6::smallint,
 'A gearset allowing the driven wheels to rotate at different speeds through a corner, while still dividing torque between them. An open differential sends equal torque to both, which means it is limited by whichever wheel has least grip.',
 'Splits drive between two wheels while permitting the speed difference that cornering requires.',
 'Case-hardened steel crown wheel and pinion with bevel or helical gears in a cast housing.',
 'Between the driven wheels, on the axle centreline.',
 'Crown-wheel and pinion wear from incorrect backlash; bearing failure; oil-seal leakage; clutch-pack wear in limited-slip units.',
 'A limited-slip or actively controlled differential is one of the largest single improvements available to a powerful car''s traction out of corners, because it stops a single unloaded wheel from dictating how much torque reaches the road.', 6),

('drivetrain', 'Constant Velocity Joint', 'cv-joint', 'transmission', 7::smallint,
 'A joint that transmits torque at a varying angle while keeping output speed constant. A simple universal joint does not — it introduces a cyclic speed variation that would be unacceptable at a steered wheel.',
 'Carries drive to a wheel that is simultaneously steering and moving through suspension travel.',
 'Hardened steel races and balls or tripod rollers, packed with grease inside a rubber boot.',
 'At both ends of each driveshaft, most critically at the front wheels of front- and four-wheel-drive cars.',
 'Boot splitting, which lets grease out and grit in — this is almost always the root cause; the characteristic symptom is clicking on full lock.',
 'Joint angle capability limits how much suspension travel and steering lock the car can use. High-articulation joints are a prerequisite for both serious off-road travel and wide-track performance geometry.', 7),

('drivetrain', 'Transfer Case', 'transfer-case', 'transmission', 8::smallint,
 'A gearbox distributing drive between front and rear axles in a four-wheel-drive vehicle. Off-road designs add a low range, typically halving the ratio for greater torque multiplication and control.',
 'Splits torque between axles, and where fitted provides a selectable low-range gear set.',
 'Cast aluminium or magnesium housing with steel gears and a chain or gear drive to the front output.',
 'Bolted to the rear of the gearbox.',
 'Chain stretch; shift-motor and actuator failure; viscous or clutch-coupling wear in automatic systems.',
 'Low range multiplies torque for steep climbs and controlled descents. A locking centre differential guarantees drive to both axles regardless of grip, which is what separates genuine off-road hardware from road-biased all-wheel drive.', 8),

-- === Suspension ============================================================
('suspension', 'MacPherson Strut', 'macpherson-strut', 'suspension', 1::smallint,
 'A suspension design combining the damper and spring into a single structural strut that also locates the top of the wheel hub, removing the need for an upper control arm.',
 'Locates the wheel and controls its vertical movement while requiring very little transverse space.',
 'Steel or aluminium strut body, coil spring, upper mount with an integrated bearing.',
 'Most commonly at the front axle.',
 'Top-mount bearing wear causing noise and stiff steering; damper seal leakage; spring fatigue or fracture.',
 'Compact and cheap, which frees space for transverse engines — the reason it dominates front-wheel-drive cars. Its weakness is that camber control through travel is poorer than a double wishbone, so the tyre leans more in hard cornering.', 1),

('suspension', 'Double Wishbone', 'double-wishbone', 'suspension', 2::smallint,
 'Two roughly A-shaped control arms locate the wheel hub at top and bottom. Their relative lengths and angles let the designer control camber and roll centre through the full range of travel.',
 'Locates the wheel with a high degree of geometric control, keeping the tyre more nearly upright as the body rolls.',
 'Forged aluminium or steel arms with ball joints and rubber or spherical bushings.',
 'Front and often rear of performance and premium cars.',
 'Ball-joint wear; bushing deterioration causing alignment drift; arm corrosion.',
 'Superior camber control keeps a larger share of the tyre contact patch on the road during cornering, which is why it is the default choice wherever packaging space and cost allow.', 2),

('suspension', 'Multi-link Suspension', 'multi-link-suspension', 'suspension', 3::smallint,
 'An arrangement using several separate links, typically four or five, each controlling one aspect of wheel motion. This decouples design parameters that simpler layouts force to be compromised together.',
 'Independently controls camber, toe, caster and anti-squat behaviour through the suspension''s travel.',
 'Forged or cast aluminium links with rubber, hydraulic or spherical bushings.',
 'Predominantly at the rear axle of premium and performance cars.',
 'Bushing wear across many joints causing cumulative alignment drift; link corrosion; higher repair cost from the number of components.',
 'Allows deliberate compliance steer — the rear wheels toeing slightly in under cornering load — which improves stability without the harshness that stiff bushings would bring.', 3),

('suspension', 'Coil Spring', 'coil-spring', 'suspension', 4::smallint,
 'A helical spring carrying the vehicle''s weight and determining its natural frequency in ride. Progressive springs vary their rate through travel, staying soft initially and stiffening as they compress.',
 'Supports the sprung mass, absorbs road inputs and returns the suspension to its ride height.',
 'Cold- or hot-wound spring steel, shot-peened and coated against corrosion.',
 'Around the damper, or separately mounted on a control arm.',
 'Fatigue fracture, usually near the end coils; corrosion where the protective coating is chipped; sagging with age causing ride-height loss.',
 'Spring rate sets body control and weight transfer. Stiffer springs reduce roll and pitch, but beyond a point the tyre struggles to follow an uneven surface and mechanical grip actually falls.', 4),

('suspension', 'Damper', 'damper', 'suspension', 5::smallint,
 'A hydraulic device converting suspension movement into heat, controlling the oscillation the spring would otherwise sustain. Adaptive dampers vary their valving electronically, often using magnetorheological fluid.',
 'Damps spring oscillation so the tyre stays in contact with the road and the body settles quickly after a disturbance.',
 'Steel or aluminium body, chromed piston rod, hydraulic oil with a nitrogen gas charge.',
 'At each corner, usually within or alongside the spring.',
 'Seal leakage; gas-charge loss causing fade and foaming; mount bushing wear; internal valve wear altering the damping curve.',
 'Damping rate is the main tool for controlling how weight transfers during transients, and therefore how the car responds to turn-in. Adaptive dampers resolve the ride-versus-control conflict by changing character within milliseconds.', 5),

('suspension', 'Anti-roll Bar', 'anti-roll-bar', 'suspension', 6::smallint,
 'A torsion spring connecting the left and right suspension. It resists only the differential movement of the two sides, so it limits body roll without stiffening the car''s response to a bump affecting both wheels.',
 'Reduces body roll in cornering and adjusts the front-to-rear distribution of roll stiffness.',
 'Spring steel bar with forged or welded end arms, mounted in rubber bushings and connected by drop links.',
 'Across the car at the front and usually the rear axle.',
 'Drop-link ball-joint wear, a very common source of knocking over bumps; bushing deterioration; rarely, bar fatigue.',
 'The front-to-rear balance of anti-roll stiffness is the most accessible tuning tool for adjusting understeer and oversteer. Stiffening the front bar increases understeer; stiffening the rear increases rotation.', 6),

('suspension', 'Air Spring', 'air-spring', 'suspension', 7::smallint,
 'A rubber-and-fabric bellows containing compressed air in place of a steel spring. Because pressure can be varied, both ride height and spring rate become controllable.',
 'Supports the vehicle while allowing ride height and effective spring rate to be adjusted on demand.',
 'Reinforced rubber bellows, aluminium piston, with an electric compressor, valve block and reservoir.',
 'At each corner, in place of coil springs.',
 'Bellows perishing and leaking with age; compressor burnout from working against a leak; valve-block and height-sensor faults.',
 'Allows a genuinely soft ride at cruise and a lowered, stiffer setting at speed, which reduces both drag and the centre of gravity. On SUVs it also provides the raised setting needed for off-road clearance.', 7),

-- === Braking ===============================================================
('braking', 'Brake Disc', 'brake-disc', 'brakes', 1::smallint,
 'The rotating disc the pads clamp against. Ventilated discs have internal vanes that pump air through the disc as it rotates, which is essential for sustained heat rejection.',
 'Provides the friction surface that converts the car''s kinetic energy into heat, and stores and sheds that heat.',
 'Grey cast iron for its heat capacity and damping; two-piece discs with aluminium hats to cut unsprung weight.',
 'Mounted on each wheel hub, inside the wheel.',
 'Thickness variation causing pedal pulsation; heat cracking from repeated severe use; corrosion pitting after prolonged standing.',
 'Disc diameter increases braking torque by leverage, and mass and venting set the fade resistance. Because the disc is unsprung and rotating, reducing its mass improves both suspension response and acceleration.', 1),

('braking', 'Brake Caliper', 'brake-caliper', 'brakes', 2::smallint,
 'The housing containing the hydraulic pistons that press the pads onto the disc. Fixed monobloc calipers, machined from a single billet, deflect far less under load than sliding calipers.',
 'Converts hydraulic pressure into the clamping force applied to the disc.',
 'Cast iron or aluminium; forged monobloc aluminium on performance applications.',
 'Straddling the brake disc at each wheel.',
 'Piston seizure from corrosion; seal failure causing fluid leakage; slide-pin binding on floating calipers producing uneven pad wear.',
 'Caliper stiffness determines pedal feel: a caliper that flexes under pressure feels soft and travels further. More pistons spread pressure more evenly across a longer pad, which improves both consistency and pad life.', 2),

('braking', 'Brake Pad', 'brake-pad', 'brakes', 3::smallint,
 'The replaceable friction element. Compound choice is a genuine trade-off: materials with a high, stable coefficient at racing temperatures usually perform poorly when cold.',
 'Presses against the disc to generate the friction that slows the car.',
 'Organic, semi-metallic, low-metallic or ceramic compounds bonded to a steel backing plate.',
 'Inside the caliper, either side of the disc.',
 'Friction-material wear to the backing plate; glazing from overheating; delamination; noise from worn anti-rattle shims.',
 'The pad compound sets both the friction coefficient and the temperature window in which it is stable. Fitting a race compound to a road car typically produces worse cold braking, which is why the choice must match actual use.', 3),

('braking', 'Carbon-Ceramic Brake Disc', 'carbon-ceramic-disc', 'brakes', 4::smallint,
 'A disc of carbon fibre in a silicon-carbide ceramic matrix. It weighs roughly half as much as cast iron, tolerates far higher temperatures, and does not corrode.',
 'Provides very high and very stable braking performance with a large reduction in unsprung rotating mass.',
 'Carbon-fibre-reinforced silicon carbide, produced by infiltrating a carbon preform with molten silicon.',
 'In place of cast-iron discs, paired with specifically matched pads.',
 'Surface-layer wear over a long life; chipping from impact; very high replacement cost; squeal and weaker bite when cold.',
 'The weight saving at each corner is large and entirely unsprung and rotating, which improves ride, steering response and acceleration simultaneously. Fade resistance is dramatically better, making them genuinely valuable for repeated high-speed stops.', 4),

('braking', 'Brake Master Cylinder', 'brake-master-cylinder', 'brakes', 5::smallint,
 'The pedal-operated hydraulic pump. Tandem design splits the system into two independent circuits so that a single hydraulic failure still leaves braking on two wheels.',
 'Converts pedal force into hydraulic pressure and distributes it to the calipers.',
 'Cast iron or aluminium bore with rubber cup seals and a plastic reservoir.',
 'On the bulkhead, behind the brake servo.',
 'Internal seal bypass causing a slowly sinking pedal; external leakage; reservoir seal failure.',
 'Bore diameter sets the ratio between pedal travel and pressure. A smaller bore gives higher pressure for a given force but demands more travel — the fundamental compromise in pedal feel.', 5),

('braking', 'ABS Module', 'abs-module', 'brakes', 6::smallint,
 'The hydraulic and electronic unit that prevents wheel lock-up by modulating pressure to individual wheels, typically several times per second, based on wheel-speed sensor data.',
 'Keeps wheels rotating under maximum braking so that steering control is retained, and forms the hydraulic basis for stability and traction control.',
 'Aluminium hydraulic block with solenoid valves, an electric pump and an integrated control unit.',
 'In the engine bay, plumbed between master cylinder and calipers.',
 'Pump-motor failure; solenoid valve sticking; wheel-speed sensor and reluctor-ring faults, which are the most common cause of an ABS warning.',
 'A locked wheel provides no steering force at all, so ABS preserves directional control rather than simply shortening stopping distance. The same hardware enables stability control, which is among the most effective safety systems ever fitted.', 6),

-- === Wheels ================================================================
('wheels', 'Alloy Wheel', 'alloy-wheel', 'wheels', 1::smallint,
 'The wheel itself. Cast wheels are cheapest; flow-formed and forged wheels align the alloy''s grain structure for greater strength at lower weight.',
 'Mounts the tyre, transmits drive and braking torque to it, and houses the brake assembly.',
 'Cast, flow-formed or forged aluminium alloy; magnesium and carbon fibre in specialist applications.',
 'At each corner, bolted to the wheel hub.',
 'Kerb damage to the rim flange; corrosion under the finish; cracking from severe pothole impact; buckling causing vibration.',
 'Wheel mass is unsprung and rotating, so it penalises acceleration, braking and ride quality more than an equivalent mass elsewhere. Larger diameters permit bigger brakes but add weight and reduce tyre sidewall compliance.', 1),

('wheels', 'Tyre', 'tyre', 'wheels', 2::smallint,
 'The only part of the car that touches the road. Every force the car generates — acceleration, braking and cornering — passes through four contact patches each roughly the size of a hand.',
 'Generates the grip that enables all vehicle control, supports the load, and provides the first stage of suspension compliance.',
 'Rubber compounds over steel belts and polyester or rayon carcass plies, with an aramid or nylon cap ply on high-speed tyres.',
 'Mounted on each wheel.',
 'Tread wear; sidewall damage from kerbing and potholes; ageing and hardening of the compound; irregular wear revealing alignment problems.',
 'No component has a larger influence on how a car performs. A tyre change alters braking distance, cornering grip, steering response, ride and noise simultaneously — routinely more than any suspension modification.', 2),

('wheels', 'Wheel Hub', 'wheel-hub', 'wheels', 3::smallint,
 'The rotating assembly the wheel bolts to, incorporating the bearing and the mounting flange for the brake disc.',
 'Supports the wheel, allows it to rotate with minimum friction, and carries all cornering, braking and vertical loads into the suspension.',
 'Forged steel hub with an integrated sealed bearing unit.',
 'At each corner, between the wheel and the suspension upright.',
 'Bearing wear producing a droning noise that changes with cornering load; ABS reluctor-ring damage; stud thread damage from overtightening.',
 'Hub and bearing stiffness affect how precisely camber is maintained under load. Excessive bearing play degrades both steering precision and the accuracy of the wheel-speed signal the stability system depends on.', 3),

('wheels', 'Tyre Pressure Monitoring Sensor', 'tpms-sensor', 'wheels', 4::smallint,
 'A sensor reporting tyre pressure, and usually temperature, by radio to the car''s receiver. Direct systems measure pressure; indirect systems infer it from differences in wheel rotation speed.',
 'Warns the driver of under-inflation before it becomes dangerous.',
 'Sealed module with a pressure transducer, radio transmitter and a non-replaceable lithium battery.',
 'Inside each tyre, usually integrated into the valve stem.',
 'Battery exhaustion after roughly five to ten years; corrosion of aluminium valve stems; damage during careless tyre fitting.',
 'Under-inflation increases rolling resistance, raises tyre temperature and degrades handling and braking, as well as risking sudden failure. Correct pressure is the cheapest available improvement to both efficiency and grip.', 4),

('wheels', 'Wheel Bearing', 'wheel-bearing', 'wheels', 5::smallint,
 'The precision rolling-element bearing allowing the hub to rotate. Modern designs are sealed, pre-loaded units replaced whole rather than serviced.',
 'Carries radial and axial wheel loads with minimum friction while maintaining precise wheel location.',
 'Hardened steel races and balls or tapered rollers, with integrated seals and grease.',
 'Within the wheel hub assembly.',
 'Seal failure admitting water and contaminant; brinelling from impact loads; wear producing noise and play.',
 'Bearing drag is a direct parasitic loss. More importantly, a worn bearing introduces camber and toe variation under load, which shows up as vague steering and uneven tyre wear.', 5),

-- === Interior ==============================================================
('interior', 'Steering Wheel', 'steering-wheel', 'interior', 1::smallint,
 'The driver''s primary control, and increasingly a control hub carrying airbag, controls, paddle shifters and sensors that detect whether hands are on the rim.',
 'Transmits the driver''s steering input to the steering system and provides the feedback through which road surface and grip are sensed.',
 'Magnesium or aluminium armature with polyurethane foam, wrapped in leather, Alcantara or carbon fibre.',
 'Directly ahead of the driver, on the steering column.',
 'Rim wear and delamination; control-switch failure; clock-spring failure disabling the airbag and wheel controls.',
 'Rim diameter sets the leverage and therefore the effective steering ratio as the driver experiences it. Feedback through the rim is the primary channel by which a driver senses approaching grip limits.', 1),

('interior', 'Seat', 'seat', 'interior', 2::smallint,
 'The occupant''s interface with the car. A performance seat''s job is to hold the body still under lateral load so the driver''s inputs stay precise and they are not bracing through the steering wheel.',
 'Supports and locates the occupant, provides the anchorage for the seatbelt, and contributes to occupant protection in a crash.',
 'Steel or magnesium frame, polyurethane foam, leather or fabric; carbon-fibre shells in lightweight bucket seats.',
 'In the cabin, on floor-mounted rails.',
 'Foam collapse with age; bolster wear at the entry side; electric motor and position-sensor failure; rail mechanism wear.',
 'Lateral support directly affects a driver''s ability to control the car under high cornering loads. Seats are also a meaningful weight saving: a pair of carbon buckets can remove tens of kilograms from a high, central position.', 2),

('interior', 'Dashboard', 'dashboard', 'interior', 3::smallint,
 'The structural and functional assembly spanning the cabin ahead of the occupants, housing instruments, vents, airbags and much of the car''s wiring.',
 'Carries the instrument and control interfaces, distributes ventilation air, and forms part of the cross-car structural beam.',
 'Injection-moulded polypropylene or ABS over a steel or magnesium cross-car beam, with slush-moulded skin and foam on premium cars.',
 'Across the front of the cabin, between the windscreen and the occupants.',
 'Squeaks and rattles from clip wear; surface cracking from UV exposure; vent-actuator failure.',
 'The cross-car beam inside is a significant structural member, resisting the cabin''s tendency to distort in a side impact and helping control steering-column vibration.', 3),

('interior', 'Infotainment Unit', 'infotainment-unit', 'interior', 4::smallint,
 'The central computer and display handling navigation, media, connectivity and, increasingly, climate and vehicle settings that were once physical controls.',
 'Provides the driver and passengers with information, entertainment and access to vehicle configuration.',
 'Capacitive touchscreen with an embedded ARM-based computing module.',
 'Centre of the dashboard, usually with the controller in the centre console.',
 'Screen delamination and touch-layer failure; software faults requiring updates; connector and harness issues.',
 'Consolidating physical controls into a touchscreen increases the time a driver''s eyes are off the road, which is why several manufacturers have reintroduced physical controls for frequently used functions.', 4),

('interior', 'Airbag', 'airbag', 'interior', 5::smallint,
 'A fabric bag inflated by a gas generator within roughly 30 milliseconds of a crash being detected. It is a supplementary restraint: it works with the seatbelt, not instead of it.',
 'Decelerates the occupant''s head and torso over a greater distance and time, reducing the peak forces applied to them.',
 'Nylon fabric bag with a pyrotechnic or stored-gas inflator and an electronic control unit.',
 'Steering wheel, dashboard, seat bolsters, roof rails and increasingly between the front seats.',
 'Inflator degradation with age and humidity; clock-spring failure disabling the driver airbag; sensor and wiring faults.',
 'Effective only in combination with a correctly worn seatbelt, which is why they are formally called supplementary restraint systems. Deployment thresholds are calibrated to avoid firing when the belt alone is sufficient.', 5),

('interior', 'Pedal Box', 'pedal-box', 'interior', 6::smallint,
 'The assembly carrying the accelerator, brake and where fitted clutch pedals, together with their sensors and linkages.',
 'Translates the driver''s foot inputs into signals or hydraulic pressure, with the leverage ratio that gives the intended pedal feel.',
 'Stamped steel or magnesium frame with plastic pedal pads and Hall-effect position sensors.',
 'In the driver''s footwell, mounted to the bulkhead.',
 'Bushing wear causing lateral play; sensor drift; pivot corrosion and stiffness.',
 'Pedal spacing and relative height determine whether heel-and-toe downshifts are practical, which is why performance cars pay particular attention to pedal geometry. Brake-pedal ratio is a key element of pedal feel.', 6),

-- === Electrical ============================================================
('electrical', 'Alternator', 'alternator', 'electronics', 1::smallint,
 'A belt-driven three-phase generator that supplies the car''s electrical load and recharges the battery. Its output is rectified to direct current and regulated internally.',
 'Generates electrical power while the engine runs, and maintains the battery''s state of charge.',
 'Aluminium housing with copper stator windings, a wound rotor, diode rectifier pack and voltage regulator.',
 'Mounted on the engine, driven by the accessory belt.',
 'Bearing wear and noise; diode failure causing charging faults or AC ripple; regulator failure over- or under-charging; slip-ring and brush wear.',
 'The alternator is a parasitic load on the engine. Smart charging strategies deliberately reduce output under acceleration and increase it during deceleration, recovering energy that would otherwise be wasted as brake heat.', 1),

('electrical', 'Starter Motor', 'starter-motor', 'electronics', 2::smallint,
 'A high-torque DC motor that cranks the engine to starting speed. Stop-start systems demand starters engineered for vastly more cycles than conventional units.',
 'Rotates the crankshaft fast enough for the engine to draw in charge, compress it and begin running on its own.',
 'Series-wound or permanent-magnet DC motor with a solenoid and a pinion on an overrunning clutch.',
 'Bolted to the engine or gearbox bellhousing, engaging the flywheel ring gear.',
 'Solenoid contact erosion, the usual cause of a click without cranking; brush wear; pinion drive failure; ring-gear tooth damage.',
 'Cranking speed affects starting quality and emissions during the first seconds. Belt-driven starter-generators allow far smoother and quicker restarts, which is what makes frequent stop-start operation acceptable to drivers.', 2),

('electrical', 'Auxiliary Battery', 'auxiliary-battery', 'electronics', 3::smallint,
 'The low-voltage battery. Present even in fully electric cars, because lights, control units, airbags and the contactors that connect the high-voltage pack all run on 12 volts.',
 'Supplies power for starting and for all low-voltage systems, and stabilises system voltage against transient loads.',
 'Lead-acid, AGM, or increasingly lithium-iron-phosphate in weight-sensitive applications.',
 'Engine bay, boot, or under a seat for weight distribution.',
 'Sulphation from prolonged undercharge; plate shedding; terminal corrosion; capacity loss in extreme temperatures.',
 'A weak 12-volt battery produces faults that look unrelated — erratic electronics, warning lights, failure to wake — because low-voltage control units misbehave before the battery fails outright. In an EV it is a common cause of a car that will not power up at all.', 3),

('electrical', 'Engine Control Unit', 'engine-control-unit', 'electronics', 4::smallint,
 'The computer managing the engine. It reads dozens of sensors and controls injection, ignition, boost, valve timing and throttle, recalculating hundreds of times per second.',
 'Determines the fuel quantity, injection timing and ignition advance for every combustion event, balancing power, efficiency, emissions and mechanical safety.',
 'Multi-core microcontroller on a sealed PCB in an aluminium or plastic housing.',
 'Engine bay or bulkhead, sometimes mounted directly on the engine.',
 'Water ingress through failed seals; connector corrosion; capacitor failure with age; corrupted software after voltage disturbances.',
 'Calibration, rather than hardware, often defines an engine''s output: identical hardware can be mapped to very different power levels. The ECU also enforces protection strategies — pulling timing on detected knock, limiting torque to protect the gearbox — that are invisible until they intervene.', 4),

('electrical', 'Wiring Harness', 'wiring-harness', 'electronics', 5::smallint,
 'The bundled conductors connecting every electrical component. A modern car''s harness can contain several kilometres of wire and is among the heaviest single components after the powertrain.',
 'Distributes power and carries signal and network communication between control units and components.',
 'Copper conductors with cross-linked polyethylene or PVC insulation, in convoluted tubing with moulded connectors.',
 'Throughout the entire vehicle.',
 'Chafing where the harness passes through the body; connector-pin corrosion and fretting; insulation embrittlement near heat sources; rodent damage.',
 'Harness mass is a real weight-reduction target, which is one reason manufacturers are moving to zonal architectures with fewer, shorter runs and data networks replacing discrete wires.', 5),

('electrical', 'Sensor Suite', 'sensor-suite', 'electronics', 6::smallint,
 'The collection of sensors feeding the car''s control systems: wheel speed, crank and cam position, oxygen, mass airflow, knock, yaw rate, and the cameras and radar behind driver-assistance features.',
 'Provides the measurements every electronic control strategy depends on, from fuel metering to stability intervention.',
 'Hall-effect, piezoelectric, MEMS, thermistor and optical elements in sealed housings.',
 'Distributed throughout the car.',
 'Contamination and drift, especially oxygen and mass-airflow sensors; connector corrosion; calibration loss after windscreen or bumper replacement disturbs camera and radar alignment.',
 'Sensor accuracy bounds what every control system can achieve — a drifting oxygen sensor degrades fuel economy and emissions long before it sets a fault code. Camera and radar recalibration after bodywork is essential, because a small aiming error becomes a large error at distance.', 6),

-- === EV Systems ============================================================
('ev-systems', 'Traction Battery Pack', 'traction-battery-pack', 'battery', 1::smallint,
 'The high-voltage energy store, typically several hundred volts and by far the heaviest single component in an electric car. It is usually a flat structure in the floor, which is also structurally useful.',
 'Stores the energy that drives the vehicle, supplying it to the inverter on demand and accepting charge from the grid and from regenerative braking.',
 'Lithium-ion cells — NMC for energy density, LFP for cost, longevity and thermal stability — in an aluminium or steel enclosure.',
 'Beneath the cabin floor, between the axles.',
 'Gradual capacity fade over years and cycles; individual cell or module failure; coolant leaks into the enclosure; underbody impact damage.',
 'Its mass and position dominate the car''s dynamics: a floor-mounted pack gives an exceptionally low centre of gravity and near-ideal weight distribution, which partly offsets the substantial weight penalty. Usable capacity, not gross, determines real range.', 1),

('ev-systems', 'Battery Module', 'battery-module', 'battery', 2::smallint,
 'An intermediate assembly of cells within the pack, with its own structure, cooling and monitoring. Cell-to-pack designs eliminate this level entirely to save weight and volume.',
 'Groups cells into a serviceable unit with defined electrical, thermal and mechanical interfaces.',
 'Cylindrical, prismatic or pouch cells in an aluminium or composite frame with busbars and sensing.',
 'Within the traction battery pack.',
 'Busbar connection loosening or corrosion; individual cell imbalance; sense-wire faults.',
 'Modular construction allows a failed section to be replaced rather than the entire pack. Cell-to-pack designs trade that serviceability for meaningfully higher energy density.', 2),

('ev-systems', 'Battery Management System', 'battery-management-system', 'battery', 3::smallint,
 'The electronics monitoring every cell group''s voltage and temperature, balancing charge between them, and enforcing the limits that keep the pack safe.',
 'Protects the pack from over-charge, over-discharge and thermal excursion, estimates state of charge and health, and balances cells.',
 'Distributed monitoring boards with a central controller, communicating over an isolated network.',
 'Inside the battery pack enclosure.',
 'Sense-wire and connector faults causing spurious cell readings; controller failure disabling the pack; state-of-charge estimation drift.',
 'The BMS decides how much of the pack''s nominal capacity and peak power the car will actually use, and shapes the charging curve. Conservative limits extend pack life at the cost of headline figures — a real engineering trade-off, not a software restriction.', 3),

('ev-systems', 'Inverter', 'inverter', 'battery', 4::smallint,
 'The power electronics converting the pack''s direct current into the variable-frequency three-phase alternating current the motor requires, and back again during regeneration.',
 'Controls motor torque and speed precisely by varying the frequency, amplitude and phase of the current supplied to it.',
 'Silicon IGBT or silicon-carbide MOSFET power modules on a liquid-cooled cold plate, with DC-link capacitors.',
 'Usually mounted directly on or beside the motor to keep the high-current path short.',
 'Power-module thermal fatigue from cycling; capacitor degradation; coolant leaks; gate-driver faults.',
 'Inverter switching speed and efficiency determine how much pack energy reaches the wheels. Silicon-carbide devices switch faster with lower losses, typically improving range by a few per cent and enabling the 800-volt architectures that make very fast charging possible.', 4),

('ev-systems', 'Electric Traction Motor', 'electric-traction-motor', 'battery', 5::smallint,
 'The motor driving the wheels. Permanent-magnet synchronous machines offer the best efficiency and power density; induction motors avoid rare-earth magnets and can be de-energised to cut drag when not driving.',
 'Converts electrical energy into rotational mechanical energy, and operates in reverse as a generator during regenerative braking.',
 'Laminated steel stator with copper windings; rotor with rare-earth permanent magnets or an aluminium or copper squirrel cage.',
 'On one or both axles, often integrated with the inverter and reduction gear into a single drive unit.',
 'Bearing wear; winding insulation breakdown; resolver and position-sensor faults; magnet demagnetisation if severely overheated.',
 'Delivers maximum torque from zero rpm, which is why even modest electric cars accelerate briskly from rest. Sustained output is limited by cooling rather than by the motor''s peak capability — the reason repeated full-power runs produce reduced performance.', 5),

('ev-systems', 'On-board Charger', 'on-board-charger', 'battery', 6::smallint,
 'The converter that rectifies alternating current from a domestic or public AC supply into the direct current the pack needs. DC rapid charging bypasses it entirely and feeds the pack directly.',
 'Converts and controls AC grid power to charge the traction battery, communicating with the charging station to negotiate current limits.',
 'Power-factor-correction and DC-DC conversion stages with silicon or silicon-carbide semiconductors, liquid- or air-cooled.',
 'Usually integrated with the inverter and DC-DC converter in a single high-voltage module.',
 'Thermal stress from sustained charging; connector and pilot-line faults; capacitor ageing.',
 'Its rating caps AC charging speed regardless of how capable the wall box is — a common and avoidable disappointment. It is irrelevant to DC rapid charging, where the charger itself supplies direct current to the pack.', 6),

('ev-systems', 'Regenerative Braking System', 'regenerative-braking-system', 'battery', 7::smallint,
 'The strategy that runs the traction motor as a generator to slow the car, returning energy to the pack instead of dissipating it as heat in the brakes.',
 'Recovers kinetic energy during deceleration and blends motor braking with the friction brakes seamlessly enough that the driver cannot feel the handover.',
 'Uses the existing motor, inverter and a brake-blending controller working with the ABS hydraulic unit.',
 'Distributed across the drive unit and brake system.',
 'Blending calibration faults producing inconsistent pedal feel; reduced regeneration on a cold or full pack, which changes deceleration unexpectedly; friction-brake corrosion from underuse.',
 'Recovers a substantial share of urban driving energy and is one of the main reasons electric cars are more efficient in city use than on the motorway. Regeneration is limited when the pack is cold or near full, which is why braking feel can change noticeably in those conditions.', 7),

('ev-systems', 'Battery Thermal Management', 'battery-thermal-management', 'battery', 8::smallint,
 'The liquid cooling and heating circuit that keeps cells in their optimum temperature window, and pre-conditions the pack ahead of rapid charging.',
 'Maintains cell temperature for performance, longevity and charging speed, and heats the pack in cold conditions so it can accept charge.',
 'Cold plates or cooling ribbons, an electric pump, chiller, radiator, and often a heat pump shared with cabin climate control.',
 'Integrated into the battery pack and connected to the vehicle''s coolant circuits.',
 'Pump failure; coolant leaks into the pack, which is a serious fault; valve and sensor faults; heat-pump refrigerant loss.',
 'Charging speed depends heavily on cell temperature: a cold pack may accept only a fraction of its rated rate. Pre-conditioning while navigating to a charger is what makes the advertised charging times achievable in practice.', 8)

) as v(category_slug, name, slug, viewer_group, display_order, description, "function", typical_materials, location, common_failure_points, performance_impact)
join public.part_categories pc on pc.slug = v.category_slug
on conflict (slug) do nothing;
-- ---------------------------------------------------------------------------
-- Car models
-- ---------------------------------------------------------------------------

insert into public.car_models (manufacturer_id, category_id, name, slug, generation, body_type, production_start, production_end, description)
select mf.id, cat.id, v.name, v.slug::public.slug, v.generation,
       v.body_type::public.body_type, v.production_start, v.production_end, v.description
from (values
  ('porsche', 'sports-car', '911', '911', '992', 'coupe', 2019::smallint, null::smallint,
   'The eighth generation of a rear-engined sports car in continuous production since 1964. Porsche has developed the 911 rather than replaced it, progressively engineering out the handling consequences of hanging the engine behind the rear axle while keeping the traction advantage that layout gives.'),
  ('porsche', 'ev', 'Taycan', 'taycan', 'J1', 'sedan', 2019::smallint, null::smallint,
   'Porsche''s first series-production electric car, and one of the first to use an 800-volt architecture. The higher voltage allows very high charging rates and thinner cabling, and the two-speed rear transmission is unusual among electric cars.'),

  ('bmw', 'sedan', 'M3', 'm3', 'G80', 'sedan', 2020::smallint, null::smallint,
   'The sixth-generation M3, powered by the S58 twin-turbo inline-six. This generation was the first M3 offered with all-wheel drive, and the first in which the Competition version became the volume choice.'),
  ('bmw', 'ev', 'i4', 'i4', 'G26', 'sedan', 2021::smallint, null::smallint,
   'An electric four-door coupé built on an adapted version of BMW''s combustion platform rather than a dedicated electric architecture, which allows it to be produced on the same line as the 4 Series.'),

  ('mercedes-benz', 'sports-car', 'AMG GT 4-Door Coupé', 'amg-gt-4-door', 'X290', 'coupe', 2018::smallint, null::smallint,
   'A four-door derivative of the AMG GT, sharing its name and styling language but built on the platform underpinning the E-Class and CLS rather than the two-seat GT''s structure.'),
  ('mercedes-benz', 'ev', 'EQS', 'eqs', 'V297', 'sedan', 2021::smallint, null::smallint,
   'Mercedes-Benz''s flagship electric saloon, built on a dedicated electric platform. Its 0.20 drag coefficient at launch was the lowest of any production car, achieved through an extremely rounded single-bow profile.'),

  ('audi', 'wagon', 'RS 6 Avant', 'rs6-avant', 'C8', 'wagon', 2019::smallint, null::smallint,
   'A performance estate built only as a wagon, carrying a twin-turbo V8 and quattro all-wheel drive. It represents a distinctly European idea: supercar pace in a body designed around load capacity.'),
  ('audi', 'supercar', 'R8', 'r8', 'Type 4S', 'coupe', 2015::smallint, 2024::smallint,
   'Audi''s mid-engined supercar, sharing its naturally aspirated V10 and much of its aluminium and carbon structure with the Lamborghini Huracán. Production ended in 2024 without a direct combustion successor.'),

  ('ferrari', 'supercar', '296 GTB', '296-gtb', 'F171', 'coupe', 2022::smallint, null::smallint,
   'A plug-in hybrid with a 120-degree twin-turbo V6 — the first six-cylinder road car to wear the Ferrari badge, following a V6 racing lineage dating to the 1950s. The wide V angle allows the turbochargers to sit inside the vee.'),
  ('ferrari', 'hypercar', 'SF90 Stradale', 'sf90-stradale', 'F173', 'coupe', 2020::smallint, null::smallint,
   'Ferrari''s first series-production plug-in hybrid and its first road car with all-wheel drive, achieved by driving the front axle with two independent electric motors rather than a mechanical link.'),
  ('ferrari', 'supercar', 'F8 Tributo', 'f8-tributo', 'F142M', 'coupe', 2019::smallint, 2023::smallint,
   'The final development of Ferrari''s twin-turbo V8 mid-engined line before the hybrid 296 replaced it, named as a tribute to that engine family.'),

  ('lamborghini', 'supercar', 'Huracán', 'huracan', 'LB724', 'coupe', 2014::smallint, 2024::smallint,
   'Lamborghini''s V10 model, sharing its platform and engine with the Audi R8. It was the last naturally aspirated V10 supercar in production, ending without a non-hybrid successor.'),
  ('lamborghini', 'hypercar', 'Revuelto', 'revuelto', 'LB744', 'coupe', 2023::smallint, null::smallint,
   'The replacement for the Aventador, pairing an all-new naturally aspirated V12 with three electric motors. Lamborghini chose to retain the V12 and add electrification rather than downsize, making it one of very few new twelve-cylinder cars.'),
  ('lamborghini', 'suv', 'Urus', 'urus', null, 'suv', 2018::smallint, null::smallint,
   'A performance SUV sharing its platform with the Audi Q7 and Porsche Cayenne. It rapidly became Lamborghini''s best-selling model, transforming the company''s production volume.'),

  ('toyota', 'sports-car', 'GR Supra', 'gr-supra', 'A90/J29', 'coupe', 2019::smallint, null::smallint,
   'The revival of the Supra name after seventeen years, co-developed with BMW and sharing its inline-six engine and much of its structure with the Z4. A manual gearbox was added in 2023 after sustained customer pressure.'),
  ('toyota', 'sedan', 'Corolla', 'corolla', 'E210', 'sedan', 2018::smallint, null::smallint,
   'The best-selling nameplate in automotive history, with over fifty million produced since 1966. The current generation is offered predominantly as a hybrid in most markets.'),

  ('honda', 'sports-car', 'Civic Type R', 'civic-type-r', 'FL5', 'hatchback', 2022::smallint, null::smallint,
   'The sixth-generation Type R and one of the fastest front-wheel-drive cars ever produced. Honda''s dual-axis front suspension separates steering and suspension loads to suppress the torque steer that high-output front drive normally produces.'),

  ('nissan', 'supercar', 'GT-R', 'gt-r', 'R35', 'coupe', 2007::smallint, null::smallint,
   'A supercar built around a rear-mounted transaxle and the ATTESA E-TS all-wheel-drive system. Each VR38DETT engine is hand-assembled in a clean room by a single Takumi technician whose name is attached to the plenum.'),
  ('nissan', 'ev', 'Leaf', 'leaf', 'ZE1', 'hatchback', 2017::smallint, 2025::smallint,
   'The second generation of the first mass-market battery-electric car. It was notable and ultimately limited by its passively air-cooled battery pack, which restricts sustained fast charging.'),

  ('ford', 'coupe', 'Mustang', 'mustang', 'S650', 'coupe', 2023::smallint, null::smallint,
   'The seventh-generation Mustang, and the last mainstream American pony car still offered with a naturally aspirated V8 and a manual gearbox.'),
  ('ford', 'pickup', 'F-150', 'f-150', 'P702', 'pickup', 2020::smallint, null::smallint,
   'The fourteenth generation of the best-selling vehicle in the United States. Its aluminium-alloy body, introduced in 2015, removed several hundred kilograms from a full-size pickup.'),

  ('tesla', 'ev', 'Model 3', 'model-3', 'Highland', 'sedan', 2023::smallint, null::smallint,
   'The updated Model 3, the car that took Tesla from a niche manufacturer to volume production. The 2023 revision focused on aerodynamics, noise insulation and interior quality.'),
  ('tesla', 'ev', 'Model S', 'model-s', 'Palladium', 'sedan', 2021::smallint, null::smallint,
   'Tesla''s flagship saloon. The Plaid powertrain uses three motors, with carbon-sleeved rotors that allow the rotor to withstand the forces at very high rotational speed.'),

  ('mclaren', 'supercar', '750S', '750s', null, 'coupe', 2023::smallint, null::smallint,
   'A comprehensive revision of the 720S, with around thirty per cent of components changed. Like every McLaren road car it is built around a carbon-fibre monocoque, which is why the kerb weight remains low despite the output.'),
  ('mclaren', 'supercar', 'Artura', 'artura', null, 'coupe', 2022::smallint, null::smallint,
   'McLaren''s first series-production plug-in hybrid, built on an all-new carbon architecture designed from the outset to package a battery. The V6 is a clean-sheet design rather than a derivative of the existing V8.'),

  ('jaguar', 'sports-car', 'F-TYPE', 'f-type', 'X152', 'coupe', 2013::smallint, 2024::smallint,
   'Jaguar''s two-seat sports car, positioned as the spiritual successor to the E-Type. Production ended in 2024 as Jaguar moved to an all-electric line-up.'),
  ('jaguar', 'ev', 'I-PACE', 'i-pace', 'X590', 'suv', 2018::smallint, null::smallint,
   'One of the first premium electric SUVs from an established manufacturer, launched on a dedicated aluminium electric platform before most of Jaguar''s German rivals had a comparable car.'),

  ('renault', 'hatchback', 'Clio', 'clio', 'V', 'hatchback', 2019::smallint, null::smallint,
   'The fifth generation of one of Europe''s best-selling superminis, in production since 1990.'),
  ('renault', 'ev', 'Megane E-Tech Electric', 'megane-e-tech', 'BCB', 'hatchback', 2022::smallint, null::smallint,
   'Renault''s electric hatchback on the dedicated CMF-EV platform, notable for an unusually thin 110 mm battery pack that preserves interior height.'),

  ('peugeot', 'suv', '3008', '3008', 'P84', 'suv', 2016::smallint, 2023::smallint,
   'The second-generation 3008, which moved the nameplate from an MPV-like body to a conventional SUV and introduced Peugeot''s small-steering-wheel i-Cockpit layout.'),
  ('peugeot', 'hatchback', '208', '208', 'P21', 'hatchback', 2019::smallint, null::smallint,
   'A supermini engineered from the start to be built with petrol, diesel or electric powertrains on the same line and the same platform.'),

  ('hyundai', 'ev', 'IONIQ 5', 'ioniq-5', 'NE', 'suv', 2021::smallint, null::smallint,
   'The first car on Hyundai''s dedicated E-GMP platform, with an 800-volt architecture supporting charging rates up to 350 kW and vehicle-to-load output from the car''s own pack.'),
  ('hyundai', 'suv', 'Creta', 'creta', 'SU2i', 'suv', 2020::smallint, null::smallint,
   'A compact SUV developed substantially for the Indian market, where it has been one of the best-selling vehicles in its segment.'),

  ('kia', 'ev', 'EV6', 'ev6', 'CV', 'suv', 2021::smallint, null::smallint,
   'Kia''s E-GMP sibling to the IONIQ 5, sharing the 800-volt architecture but with a lower, more coupé-like body and a distinct chassis calibration.'),
  ('kia', 'suv', 'Seltos', 'seltos', 'SP2i', 'suv', 2019::smallint, null::smallint,
   'A compact SUV sharing its platform with the Hyundai Creta, positioned with a firmer chassis tune and a wider engine range.'),

  ('koenigsegg', 'hypercar', 'Jesko', 'jesko', null, 'coupe', 2022::smallint, null::smallint,
   'A hypercar built in very small numbers, named after the founder''s father. It uses the in-house Light Speed Transmission, a nine-speed multi-clutch design with no synchronisers that can shift directly to any gear rather than stepping through them.'),

  ('volvo', 'suv', 'XC90', 'xc90', 'SPA', 'suv', 2015::smallint, null::smallint,
   'Volvo''s flagship seven-seat SUV. No occupant of an XC90 in the United Kingdom was reported killed in the twelve years following its 2002 launch, a record frequently cited in discussions of vehicle safety design.'),
  ('volvo', 'ev', 'EX30', 'ex30', 'SEA', 'suv', 2023::smallint, null::smallint,
   'Volvo''s smallest electric SUV, designed with an explicit target for reduced lifecycle carbon footprint including substantial recycled content in the interior.'),

  ('byd', 'ev', 'Seal', 'seal', null, 'sedan', 2022::smallint, null::smallint,
   'An electric saloon using BYD''s cell-to-body construction, in which the Blade battery pack forms part of the car''s structure rather than being carried by it.'),
  ('byd', 'ev', 'Atto 3', 'atto-3', null, 'suv', 2022::smallint, null::smallint,
   'BYD''s first model sold widely outside China, using the lithium-iron-phosphate Blade battery that trades some energy density for cost, longevity and thermal stability.'),

  ('tata', 'ev', 'Nexon EV', 'nexon-ev', null, 'suv', 2020::smallint, null::smallint,
   'India''s best-selling electric car for several years running, and the model that made electric vehicles a mainstream proposition in the Indian market.'),
  ('tata', 'suv', 'Harrier', 'harrier', null, 'suv', 2019::smallint, null::smallint,
   'A mid-size SUV built on a platform derived from Land Rover''s D8, adapted by Tata as the OMEGA architecture following its ownership of Jaguar Land Rover.'),
  ('tata', 'hatchback', 'Altroz', 'altroz', null, 'hatchback', 2020::smallint, null::smallint,
   'A premium hatchback and the first Indian car to receive a five-star Global NCAP adult occupant rating under the then-current protocol.'),

  ('mahindra', 'off-road', 'Thar', 'thar', null, 'off_road', 2020::smallint, null::smallint,
   'A ladder-frame off-roader descended directly from the Willys Jeeps Mahindra assembled under licence from 1947, with low-range transfer case and a mechanical locking differential.'),
  ('mahindra', 'suv', 'XUV700', 'xuv700', null, 'suv', 2021::smallint, null::smallint,
   'A monocoque seven-seat SUV that brought advanced driver-assistance systems to a mainstream Indian price point.'),
  ('mahindra', 'suv', 'Scorpio-N', 'scorpio-n', null, 'suv', 2022::smallint, null::smallint,
   'A ladder-frame SUV sold alongside, rather than replacing, the previous Scorpio, with a more road-biased chassis than the Thar while retaining genuine four-wheel-drive hardware.')
) as v(manufacturer_slug, category_slug, name, slug, generation, body_type, production_start, production_end, description)
join public.manufacturers mf on mf.slug = v.manufacturer_slug
join public.categories cat on cat.slug = v.category_slug
on conflict (manufacturer_id, slug) do nothing;

-- ---------------------------------------------------------------------------
-- Engine position (migration 0006)
--
-- Set with an UPDATE rather than in the insert above, so re-running this seed
-- fills the column in on a database seeded before the column existed. Models
-- not listed are battery-electric and keep NULL: they have no engine.
--
-- rear: behind the rear axle. mid: between the cabin and the rear axle.
-- ---------------------------------------------------------------------------

do $do$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'car_models'
      and column_name = 'engine_position'
  ) then
    update public.car_models m
       set engine_position = v.engine_position::public.engine_position
      from (values
        ('porsche', '911', 'rear'),

        ('audi', 'r8', 'mid'),
        ('ferrari', '296-gtb', 'mid'),
        ('ferrari', 'f8-tributo', 'mid'),
        ('ferrari', 'sf90-stradale', 'mid'),
        ('koenigsegg', 'jesko', 'mid'),
        ('lamborghini', 'huracan', 'mid'),
        ('lamborghini', 'revuelto', 'mid'),
        ('mclaren', '750s', 'mid'),
        ('mclaren', 'artura', 'mid'),

        ('audi', 'rs6-avant', 'front'),
        ('bmw', 'm3', 'front'),
        ('ford', 'f-150', 'front'),
        ('ford', 'mustang', 'front'),
        ('honda', 'civic-type-r', 'front'),
        ('hyundai', 'creta', 'front'),
        ('jaguar', 'f-type', 'front'),
        ('kia', 'seltos', 'front'),
        ('lamborghini', 'urus', 'front'),
        ('mahindra', 'scorpio-n', 'front'),
        ('mahindra', 'thar', 'front'),
        ('mahindra', 'xuv700', 'front'),
        ('mercedes-benz', 'amg-gt-4-door', 'front'),
        ('nissan', 'gt-r', 'front'),
        ('peugeot', '3008', 'front'),
        ('renault', 'clio', 'front'),
        ('tata', 'altroz', 'front'),
        ('tata', 'harrier', 'front'),
        ('toyota', 'corolla', 'front'),
        ('toyota', 'gr-supra', 'front'),
        ('volvo', 'xc90', 'front')
      ) as v(manufacturer_slug, model_slug, engine_position)
      join public.manufacturers mf on mf.slug = v.manufacturer_slug
     where m.manufacturer_id = mf.id
       and m.slug = v.model_slug
       and m.engine_position is distinct from v.engine_position::public.engine_position;
  end if;
end;
$do$;
-- ---------------------------------------------------------------------------
-- Car variants
--
-- UNITS: power is stored exactly as the manufacturer publishes it. European
-- makers quote metric horsepower (PS/cv); US and Japanese makers quote SAE
-- net horsepower. The two differ by about 1.4%, which is recorded in each
-- row's `source` so the compare page can be read honestly.
--
-- PRICES are approximate launch prices in the market named by price_currency.
-- They are indicative only and are omitted where no confident figure exists.
-- ---------------------------------------------------------------------------

insert into public.car_variants (model_id, name, slug, year_start, year_end, base_price, price_currency, fuel_type, drive_type, engine_id, transmission_id, description, source, notes)
select m.id, v.name, v.slug::public.slug, v.year_start, v.year_end,
       v.base_price, v.price_currency, v.fuel_type::public.fuel_type,
       v.drive_type::public.drive_type, e.id, t.id, v.description, v.source, v.notes
from (values

-- Porsche 911 (992)
('porsche','911','Carrera S','carrera-s',2019::smallint,null::smallint,113300::numeric,'USD','petrol','rwd',
 'Porsche 9A2 Evo 3.0 Twin-Turbo Flat-6','Porsche 8-speed PDK',
 'The volume 911. Twin-turbo flat-six mounted behind the rear axle, driving the rear wheels through an eight-speed dual-clutch transmission.',
 'Porsche published specifications (metric PS)','Price is the approximate US launch MSRP and excludes options and destination.'),
('porsche','911','Turbo S','turbo-s',2020::smallint,null::smallint,203500::numeric,'USD','petrol','awd',
 'Porsche 9A2 Evo 3.0 Twin-Turbo Flat-6','Porsche 8-speed PDK',
 'The all-wheel-drive flagship of the range, with larger variable-geometry turbochargers and substantially wider rear bodywork than the Carrera.',
 'Porsche published specifications (metric PS)','Price is the approximate US launch MSRP.'),
('porsche','911','GT3','gt3',2021::smallint,null::smallint,161100::numeric,'USD','petrol','rwd',
 'Porsche 4.0 Naturally Aspirated Flat-6','Porsche 6-speed GT manual',
 'A naturally aspirated, 9,000 rpm motorsport derivative with a double-wishbone front axle adapted directly from the 911 RSR race car.',
 'Porsche published specifications (metric PS)','Figures quoted for the six-speed manual. The PDK version is marginally quicker to 100 km/h and marginally slower at top speed.'),

-- Porsche Taycan
('porsche','taycan','Turbo S','turbo-s',2020::smallint,2023::smallint,null::numeric,null,'electric','awd',
 null,'Single-speed reduction gear',
 'The launch flagship of the Taycan range. Despite the "Turbo" name, which Porsche carried over as a trim designation, it has no turbocharger.',
 'Porsche published specifications','Uses a two-speed transmission on the rear axle and a single-speed on the front; stored here as single-speed, which is the dominant arrangement. Overboost power is available only with launch control.'),

-- BMW M3 (G80)
('bmw','m3','M3','m3',2020::smallint,null::smallint,null::numeric,null,'petrol','rwd',
 'BMW S58 3.0 Twin-Turbo Inline-6','BMW 6-speed manual',
 'The base M3, and the only version offered with a manual gearbox. Rear-wheel drive with no all-wheel-drive option.',
 'BMW M published specifications (metric PS)',null),
('bmw','m3','Competition','m3-competition',2021::smallint,null::smallint,null::numeric,null,'petrol','rwd',
 'BMW S58 3.0 Twin-Turbo Inline-6','BMW M Steptronic 8-speed',
 'Higher boost pressure and a reinforced crankshaft main bearing, paired exclusively with the eight-speed torque-converter automatic.',
 'BMW M published specifications (metric PS)','Top speed is electronically limited to 250 km/h; the optional M Driver''s Package raises the limiter to 290 km/h.'),
('bmw','m3','Competition xDrive','m3-competition-xdrive',2021::smallint,null::smallint,null::numeric,null,'petrol','awd',
 'BMW S58 3.0 Twin-Turbo Inline-6','BMW M Steptronic 8-speed',
 'The Competition with M xDrive all-wheel drive, which includes a 2WD mode that fully decouples the front axle.',
 'BMW M published specifications (metric PS)','Identical output to the rear-drive Competition; the improvement to 100 km/h comes entirely from traction.'),

-- BMW i4
('bmw','i4','M50','m50',2021::smallint,null::smallint,null::numeric,null,'electric','awd',
 null,'Single-speed reduction gear',
 'The first battery-electric car developed by BMW M, using a current-excited synchronous motor on each axle that avoids rare-earth permanent magnets.',
 'BMW published specifications (metric PS)','Peak output is available only briefly in Sport Boost mode.'),

-- Mercedes-AMG GT 4-Door
('mercedes-benz','amg-gt-4-door','GT 63 S 4MATIC+','gt-63-s',2018::smallint,2023::smallint,null::numeric,null,'petrol','awd',
 'Mercedes-AMG M177 4.0 V8 Biturbo','Mercedes-AMG SPEEDSHIFT MCT 9G',
 'The V8 flagship of the four-door GT range, with fully variable all-wheel drive and rear-axle steering.',
 'Mercedes-AMG published specifications (metric PS)',null),

-- Mercedes EQS
('mercedes-benz','eqs','EQS 450+','eqs-450-plus',2021::smallint,null::smallint,null::numeric,null,'electric','rwd',
 null,'Single-speed reduction gear',
 'The single-motor, rear-drive EQS, and the longest-range version of the car because it carries the least drivetrain mass.',
 'Mercedes-Benz published specifications (metric PS)','Mercedes publishes usable battery capacity rather than gross, so gross capacity is recorded as unavailable. WLTP range is the maximum of the published band and varies considerably with wheel size.'),

-- Audi RS 6 Avant
('audi','rs6-avant','RS 6 Avant','rs6-avant',2019::smallint,null::smallint,null::numeric,null,'petrol','awd',
 'Audi EA825 4.0 V8 TFSI Biturbo','Audi 8-speed tiptronic',
 'A twin-turbo V8 estate with quattro all-wheel drive, air suspension and a mild-hybrid 48-volt system that allows cylinder deactivation and coasting.',
 'Audi published specifications (metric PS)','Top speed is limited to 250 km/h as standard; optional packages raise it to 280 or 305 km/h.'),

-- Audi R8
('audi','r8','V10 performance quattro','v10-performance-quattro',2019::smallint,2024::smallint,null::numeric,null,'petrol','awd',
 'Audi 5.2 FSI V10','Audi 7-speed S tronic',
 'The final and most powerful development of the naturally aspirated R8, with a dry-sump V10 revving to 8,700 rpm.',
 'Audi published specifications (metric PS)',null),

-- Ferrari 296 GTB
('ferrari','296-gtb','296 GTB','296-gtb',2022::smallint,null::smallint,null::numeric,null,'phev','rwd',
 'Ferrari F163 3.0 V6 Turbo','Ferrari 8-speed DCT',
 'A plug-in hybrid pairing a 120-degree twin-turbo V6 with a single electric motor between engine and gearbox, for a combined 830 cv.',
 'Ferrari published specifications (metric cv)','Ferrari publishes dry weight, not kerb weight, so kerb weight is recorded as unavailable. Top speed is published as "over 330 km/h" and is stored at that lower bound.'),

-- Ferrari SF90 Stradale
('ferrari','sf90-stradale','SF90 Stradale','sf90-stradale',2020::smallint,null::smallint,null::numeric,null,'phev','awd',
 'Ferrari F154FA 4.0 V8 Turbo','Ferrari 8-speed DCT',
 'Ferrari''s first all-wheel-drive road car, driving the front axle with two independent electric motors and the rear with the V8 plus a third motor.',
 'Ferrari published specifications (metric cv)','Ferrari publishes dry weight, not kerb weight. Combined system torque is not published separately from the engine figure.'),

-- Ferrari F8 Tributo
('ferrari','f8-tributo','F8 Tributo','f8-tributo',2019::smallint,2023::smallint,null::numeric,null,'petrol','rwd',
 'Ferrari F154 3.9 V8 Turbo','Ferrari 7-speed DCT',
 'The last of Ferrari''s non-hybrid mid-engined V8 cars, using a development of the engine voted International Engine of the Year four years running.',
 'Ferrari published specifications (metric cv)','Ferrari publishes dry weight, not kerb weight.'),

-- Lamborghini Huracán
('lamborghini','huracan','EVO AWD','evo-awd',2019::smallint,2024::smallint,null::numeric,null,'petrol','awd',
 'Lamborghini 5.2 V10','Lamborghini 7-speed LDF DCT',
 'The mid-life revision of the Huracán, adding rear-wheel steering and a predictive vehicle dynamics controller.',
 'Lamborghini published specifications (metric cv)','Lamborghini publishes dry weight, not kerb weight.'),
('lamborghini','huracan','STO','sto',2021::smallint,2024::smallint,null::numeric,null,'petrol','rwd',
 'Lamborghini 5.2 V10','Lamborghini 7-speed LDF DCT',
 'A rear-drive, track-focused homologation model derived from the Super Trofeo racing cars, with a one-piece carbon clamshell front section.',
 'Lamborghini published specifications (metric cv)','Lamborghini publishes dry weight, not kerb weight. Top speed is lower than the EVO because of the substantially higher downforce.'),

-- Lamborghini Revuelto
('lamborghini','revuelto','Revuelto','revuelto',2023::smallint,null::smallint,null::numeric,null,'phev','awd',
 'Lamborghini L545 6.5 V12','Lamborghini 8-speed DCT',
 'An all-new naturally aspirated V12 with three electric motors — two driving the front wheels independently and one integrated with the gearbox.',
 'Lamborghini published specifications (metric cv)','Lamborghini publishes dry weight, not kerb weight. Combined system torque is not published.'),

-- Lamborghini Urus
('lamborghini','urus','S','urus-s',2022::smallint,null::smallint,null::numeric,null,'petrol','awd',
 'Audi/Lamborghini 4.0 V8 Biturbo (Urus)','8-speed automatic',
 'A twin-turbo V8 SUV with air suspension, active anti-roll bars, rear-wheel steering and a torque-vectoring rear differential.',
 'Lamborghini published specifications (metric cv)',null),

-- Toyota GR Supra
('toyota','gr-supra','3.0 Automatic','3-0-automatic',2021::smallint,null::smallint,null::numeric,null,'petrol','rwd',
 'BMW B58 3.0 Turbo Inline-6','ZF 8HP 8-speed automatic',
 'The turbocharged inline-six Supra with the eight-speed automatic, which remains the quickest configuration to 100 km/h.',
 'Toyota published specifications (SAE net hp)','Top speed is electronically limited to 250 km/h.'),
('toyota','gr-supra','3.0 Manual','3-0-manual',2023::smallint,null::smallint,null::numeric,null,'petrol','rwd',
 'BMW B58 3.0 Turbo Inline-6','6-speed manual',
 'A six-speed manual added in 2023, with a bespoke clutch, a shorter final drive and a revised stability-control calibration.',
 'Toyota published specifications (SAE net hp)','Slower to 100 km/h than the automatic despite identical output.'),

-- Toyota Corolla
('toyota','corolla','1.8 Hybrid','1-8-hybrid',2019::smallint,null::smallint,null::numeric,null,'hybrid','fwd',
 'Toyota 2ZR-FXE 1.8 Hybrid Inline-4','Toyota e-CVT (Hybrid Synergy Drive)',
 'The fifth generation of Toyota''s hybrid system, pairing an Atkinson-cycle petrol engine with two motor-generators through a planetary power split.',
 'Toyota published specifications (metric PS)','Power is the combined system output. The battery is a small buffer for a self-charging hybrid and supports no meaningful electric-only range, so EV range is recorded as unavailable.'),

-- Honda Civic Type R
('honda','civic-type-r','Type R','type-r',2022::smallint,null::smallint,null::numeric,null,'petrol','fwd',
 'Honda K20C1 2.0 Turbo Inline-4','Honda 6-speed manual',
 'A front-wheel-drive hot hatch with a helical limited-slip differential and dual-axis front struts, offered only with a manual gearbox.',
 'Honda published specifications (metric PS)',null),

-- Nissan GT-R
('nissan','gt-r','Premium','premium',2017::smallint,null::smallint,null::numeric,null,'petrol','awd',
 'Nissan VR38DETT 3.8 V6 Twin-Turbo','Nissan GR6 6-speed DCT',
 'The standard GT-R, with a hand-assembled twin-turbo V6 and a rear-mounted transaxle driving all four wheels through ATTESA E-TS.',
 'Nissan published specifications (metric PS)','Nissan does not publish a consistent 0-100 km/h figure across markets and independent tests vary widely, so it is recorded as unavailable.'),
('nissan','gt-r','NISMO','nismo',2019::smallint,null::smallint,null::numeric,null,'petrol','awd',
 'Nissan VR38DETT 3.8 V6 Twin-Turbo','Nissan GR6 6-speed DCT',
 'The NISMO version, with turbochargers derived from the GT3 racing car, wider carbon bodywork and carbon-ceramic brakes.',
 'Nissan published specifications (metric PS)','0-100 km/h is not consistently published; recorded as unavailable.'),

-- Nissan Leaf
('nissan','leaf','e+','e-plus',2019::smallint,2025::smallint,null::numeric,null,'electric','fwd',
 null,'Single-speed reduction gear',
 'The long-range Leaf, with a 62 kWh pack. The battery is passively air-cooled, which limits sustained rapid charging on long journeys.',
 'Nissan published specifications (metric PS)',null),

-- Ford Mustang
('ford','mustang','GT Fastback','gt-fastback',2023::smallint,null::smallint,null::numeric,null,'petrol','rwd',
 'Ford Coyote 5.0 V8','Ford 6-speed manual',
 'The naturally aspirated 5.0-litre V8 Mustang, still offered with a six-speed manual gearbox.',
 'Ford published specifications (SAE net hp)','Ford does not publish official 0-100 km/h or top speed figures for this variant, so both are recorded as unavailable.'),

-- Ford F-150
('ford','f-150','3.5 EcoBoost','3-5-ecoboost',2021::smallint,null::smallint,null::numeric,null,'petrol','4wd',
 'Ford 3.5 EcoBoost V6','Ford 10-speed automatic',
 'The twin-turbo V6 F-150, which outsells the V8 in this generation on the strength of its torque and towing capacity.',
 'Ford published specifications (SAE net hp)','Performance figures vary substantially with cab, bed and axle configuration and are not published per-configuration, so they are recorded as unavailable.'),

-- Tesla Model 3
('tesla','model-3','Long Range AWD','long-range-awd',2023::smallint,null::smallint,null::numeric,null,'electric','awd',
 null,'Single-speed reduction gear',
 'The dual-motor Long Range Model 3, with an induction motor at the front and a permanent-magnet motor at the rear.',
 'Tesla published specifications','Tesla does not publish motor power output or gross battery capacity for this car, so both are recorded as unavailable.'),
('tesla','model-3','Performance','performance',2024::smallint,null::smallint,null::numeric,null,'electric','awd',
 null,'Single-speed reduction gear',
 'The Performance Model 3, with uprated motors, adaptive damping and a lowered, stiffened chassis.',
 'Tesla published specifications','Tesla does not publish motor power output or gross battery capacity, so both are recorded as unavailable.'),

-- Tesla Model S
('tesla','model-s','Plaid','plaid',2021::smallint,null::smallint,null::numeric,null,'electric','awd',
 null,'Single-speed reduction gear',
 'A tri-motor saloon using carbon-sleeved rotors that contain the magnets against the forces generated at very high rotational speed.',
 'Tesla published specifications','Tesla quotes 0-60 mph "with rollout subtracted", a drag-strip convention that removes roughly 0.2 s. The 0-100 km/h figure here is the widely reported independent result rather than the marketing number.'),

-- McLaren 750S
('mclaren','750s','Coupé','coupe',2023::smallint,null::smallint,null::numeric,null,'petrol','rwd',
 'McLaren M840T 4.0 V8 Twin-Turbo','McLaren 7-speed SSG',
 'A carbon-monocoque supercar whose low kerb weight, rather than outright power, is the main source of its performance.',
 'McLaren published specifications (metric PS)','Kerb weight is the DIN figure including fluids; McLaren separately quotes a lightest dry weight of 1,277 kg.'),

-- McLaren Artura
('mclaren','artura','Artura','artura',2022::smallint,null::smallint,null::numeric,null,'phev','rwd',
 'McLaren M630 3.0 V6 Twin-Turbo','McLaren 8-speed SSG',
 'McLaren''s first series plug-in hybrid, on an all-new carbon architecture designed around the battery. The gearbox has no reverse gear — the electric motor reverses the car.',
 'McLaren published specifications (metric PS)','Kerb weight is the DIN figure including fluids.'),

-- Jaguar F-TYPE
('jaguar','f-type','R AWD','r-awd',2020::smallint,2024::smallint,null::numeric,null,'petrol','awd',
 'Jaguar AJ133 5.0 V8 Supercharged','Jaguar 8-speed Quickshift automatic',
 'The supercharged V8 F-TYPE with all-wheel drive, an active exhaust and an electronic rear differential.',
 'Jaguar published specifications (metric PS)',null),

-- Jaguar I-PACE
('jaguar','i-pace','EV400','ev400',2018::smallint,null::smallint,null::numeric,null,'electric','awd',
 null,'Single-speed reduction gear',
 'A dual-motor electric SUV on a dedicated aluminium platform, with a cab-forward layout made possible by the absence of an engine.',
 'Jaguar published specifications (metric PS)',null),

-- Renault Clio
('renault','clio','TCe 90','tce-90',2020::smallint,null::smallint,null::numeric,null,'petrol','fwd',
 'Renault TCe 1.3 Turbo Inline-4','6-speed manual',
 'The mainstream petrol Clio, with a turbocharged three-cylinder-derived four and a six-speed manual.',
 'Renault published specifications (metric PS)','Renault publishes consumption in l/100 km rather than km/l, so fuel economy is recorded as unavailable rather than converted.'),

-- Renault Megane E-Tech
('renault','megane-e-tech','EV60 220hp','ev60-220',2022::smallint,null::smallint,null::numeric,null,'electric','fwd',
 null,'Single-speed reduction gear',
 'A compact electric hatchback with an unusually thin 110 mm battery pack, which preserves interior space in a low body.',
 'Renault published specifications (metric PS)',null),

-- Peugeot 3008
('peugeot','3008','PureTech 130','puretech-130',2018::smallint,2023::smallint,null::numeric,null,'petrol','fwd',
 'Peugeot PureTech 1.2 Turbo Inline-3','8-speed automatic',
 'The volume petrol 3008, using a turbocharged 1.2-litre three-cylinder engine.',
 'Peugeot published specifications (metric PS)','Peugeot publishes consumption in l/100 km; not converted.'),

-- Peugeot 208
('peugeot','208','e-208','e-208',2019::smallint,null::smallint,null::numeric,null,'electric','fwd',
 null,'Single-speed reduction gear',
 'The electric 208, built on the same line and platform as the petrol and diesel versions.',
 'Peugeot published specifications (metric PS)',null),

-- Hyundai IONIQ 5
('hyundai','ioniq-5','Long Range AWD','long-range-awd',2021::smallint,null::smallint,null::numeric,null,'electric','awd',
 null,'Single-speed reduction gear',
 'The dual-motor IONIQ 5 on the 800-volt E-GMP platform, capable of charging from 10 to 80 per cent in about eighteen minutes on a 350 kW charger.',
 'Hyundai published specifications (metric PS)',null),

-- Hyundai Creta
('hyundai','creta','1.5 Turbo Petrol DCT','1-5-turbo-dct',2024::smallint,null::smallint,null::numeric,null,'petrol','fwd',
 'Hyundai Smartstream 1.5 Turbo Inline-4','7-speed DCT',
 'The turbocharged petrol Creta with a seven-speed dual-clutch gearbox, the performance option in the Indian range.',
 'Hyundai published specifications (metric PS)','ARAI fuel-economy figures differ by variant and model year and are not reproduced here without a confident source.'),

-- Kia EV6
('kia','ev6','GT','gt',2022::smallint,null::smallint,null::numeric,null,'electric','awd',
 null,'Single-speed reduction gear',
 'The performance EV6, with an electronic limited-slip differential and a drift mode that biases torque fully rearward.',
 'Kia published specifications (metric PS)',null),

-- Kia Seltos
('kia','seltos','1.5 Turbo Petrol DCT','1-5-turbo-dct',2023::smallint,null::smallint,null::numeric,null,'petrol','fwd',
 'Hyundai Smartstream 1.5 Turbo Inline-4','7-speed DCT',
 'The turbocharged petrol Seltos, sharing its powertrain with the Hyundai Creta but with a firmer chassis calibration.',
 'Kia published specifications (metric PS)','ARAI fuel-economy figures are not reproduced here without a confident source.'),

-- Koenigsegg Jesko
('koenigsegg','jesko','Absolut','absolut',2022::smallint,null::smallint,null::numeric,null,'petrol','rwd',
 'Koenigsegg 5.0 V8 Twin-Turbo (Jesko)','Koenigsegg Light Speed Transmission 9-speed',
 'The low-drag version of the Jesko, with the rear wing removed and the bodywork extended for minimum aerodynamic resistance.',
 'Koenigsegg published specifications (metric PS)','Power is quoted on standard petrol; Koenigsegg publishes 1,600 PS on E85. Koenigsegg has never verified a top speed for the Absolut — published figures above 500 km/h are simulations — so top speed is recorded as unavailable. 0-100 km/h is likewise not officially published.'),

-- Volvo XC90
('volvo','xc90','T8 Recharge','t8-recharge',2019::smallint,null::smallint,null::numeric,null,'phev','awd',
 'Volvo B420 2.0 Turbo Inline-4 (T8)','8-speed automatic',
 'A plug-in hybrid seven-seat SUV, with the petrol engine driving the front axle and an electric motor driving the rear — so there is no mechanical connection between them.',
 'Volvo Cars published specifications (metric PS)','Top speed is limited to 180 km/h across the Volvo range as a company safety policy, not an engineering limit.'),

-- Volvo EX30
('volvo','ex30','Twin Motor Performance','twin-motor-performance',2023::smallint,null::smallint,null::numeric,null,'electric','awd',
 null,'Single-speed reduction gear',
 'The quickest-accelerating Volvo yet built, in the company''s smallest SUV body.',
 'Volvo Cars published specifications (metric PS)','Top speed is limited to 180 km/h as a company policy.'),

-- BYD Seal
('byd','seal','AWD Performance','awd-performance',2022::smallint,null::smallint,null::numeric,null,'electric','awd',
 null,'Single-speed reduction gear',
 'A dual-motor electric saloon using cell-to-body construction, where the Blade battery forms part of the structure rather than being carried within it.',
 'BYD published specifications (metric PS)',null),

-- BYD Atto 3
('byd','atto-3','Atto 3','atto-3',2022::smallint,null::smallint,null::numeric,null,'electric','fwd',
 null,'Single-speed reduction gear',
 'A compact electric SUV using BYD''s lithium-iron-phosphate Blade battery, which trades energy density for longevity and thermal stability.',
 'BYD published specifications (metric PS)',null),

-- Tata Nexon EV
('tata','nexon-ev','Long Range','long-range',2023::smallint,null::smallint,null::numeric,null,'electric','fwd',
 null,'Single-speed reduction gear',
 'The long-range Nexon EV, India''s best-selling electric car for several consecutive years.',
 'Tata Motors published specifications (metric PS)','Range is the MIDC/ARAI certified figure, which is measured on a different cycle from WLTP and is not directly comparable to it.'),

-- Tata Harrier
('tata','harrier','2.0 Diesel','2-0-diesel',2023::smallint,null::smallint,null::numeric,null,'diesel','fwd',
 'Tata Kryotec 2.0 Diesel Inline-4','6-speed manual',
 'The diesel Harrier, on a platform derived from Land Rover''s D8 architecture.',
 'Tata Motors published specifications (metric PS)','ARAI fuel-economy figures differ by variant and are not reproduced without a confident source.'),

-- Tata Altroz
('tata','altroz','1.2 Petrol','1-2-petrol',2020::smallint,null::smallint,null::numeric,null,'petrol','fwd',
 null,'5-speed AMT',
 'The petrol Altroz, the first Indian car to achieve a five-star Global NCAP adult occupant rating under the protocol in force at the time.',
 'Tata Motors published specifications (metric PS)','The exact specification of the 1.2-litre petrol engine in this variant is not known with confidence, so no engine record is linked rather than linking an incorrect one.'),

-- Mahindra Thar
('mahindra','thar','2.2 Diesel 4WD','2-2-diesel-4wd',2020::smallint,null::smallint,null::numeric,null,'diesel','4wd',
 'Mahindra mHawk 2.2 Diesel Inline-4','6-speed manual',
 'A ladder-frame off-roader with a low-range transfer case and a mechanical locking rear differential, descended from the Willys Jeeps Mahindra built under licence.',
 'Mahindra published specifications (metric PS)','ARAI fuel-economy figures are not reproduced without a confident source.'),

-- Mahindra XUV700
('mahindra','xuv700','AX7 Petrol AT','ax7-petrol-at',2021::smallint,null::smallint,null::numeric,null,'petrol','fwd',
 'Mahindra mStallion 2.0 Turbo Inline-4','6-speed automatic',
 'The turbocharged petrol XUV700 with a torque-converter automatic, offering adaptive cruise control and lane-keeping at a mainstream Indian price.',
 'Mahindra published specifications (metric PS)',null),

-- Mahindra Scorpio-N
('mahindra','scorpio-n','Z8L Diesel 4WD','z8l-diesel-4wd',2022::smallint,null::smallint,null::numeric,null,'diesel','4wd',
 'Mahindra mHawk 2.2 Diesel Inline-4','6-speed automatic',
 'The four-wheel-drive diesel Scorpio-N, with a selectable terrain-management system and a ladder-frame chassis.',
 'Mahindra published specifications (metric PS)',null)

) as v(manufacturer_slug, model_slug, name, slug, year_start, year_end, base_price, price_currency, fuel_type, drive_type, engine_name, transmission_name, description, source, notes)
join public.manufacturers mf on mf.slug = v.manufacturer_slug
join public.car_models m on m.manufacturer_id = mf.id and m.slug = v.model_slug
left join public.engines e on e.name = v.engine_name
left join public.transmissions t on t.name = v.transmission_name
on conflict (model_id, slug) do nothing;
-- ---------------------------------------------------------------------------
-- Performance specifications
--
-- NULL means "not published with confidence", not "zero". Each variant's
-- notes column explains any figure that is deliberately absent.
-- ---------------------------------------------------------------------------

insert into public.performance_specs (variant_id, power_hp, torque_nm, top_speed_kmh, zero_to_100_s, zero_to_200_s, source)
select cv.id, v.power_hp, v.torque_nm, v.top_speed_kmh, v.zero_to_100_s, v.zero_to_200_s, v.source
from (values
  ('porsche','911','carrera-s',450,530,308,3.7,12.8,'Porsche published specifications'),
  ('porsche','911','turbo-s',650,800,330,2.7,8.9,'Porsche published specifications'),
  ('porsche','911','gt3',510,470,320,3.4,11.6,'Porsche published specifications'),
  ('porsche','taycan','turbo-s',761,1050,260,2.8,9.8,'Porsche published specifications'),

  ('bmw','m3','m3',480,550,250,4.2,null,'BMW M published specifications'),
  ('bmw','m3','m3-competition',510,650,250,3.9,12.5,'BMW M published specifications'),
  ('bmw','m3','m3-competition-xdrive',510,650,250,3.5,12.0,'BMW M published specifications'),
  ('bmw','i4','m50',544,795,225,3.9,null,'BMW published specifications'),

  ('mercedes-benz','amg-gt-4-door','gt-63-s',639,900,315,3.2,null,'Mercedes-AMG published specifications'),
  ('mercedes-benz','eqs','eqs-450-plus',333,568,210,6.2,null,'Mercedes-Benz published specifications'),

  ('audi','rs6-avant','rs6-avant',600,800,250,3.6,12.0,'Audi published specifications'),
  ('audi','r8','v10-performance-quattro',620,580,331,3.1,9.9,'Audi published specifications'),

  ('ferrari','296-gtb','296-gtb',830,740,330,2.9,7.3,'Ferrari published specifications'),
  ('ferrari','sf90-stradale','sf90-stradale',1000,800,340,2.5,6.7,'Ferrari published specifications'),
  ('ferrari','f8-tributo','f8-tributo',720,770,340,2.9,7.8,'Ferrari published specifications'),

  ('lamborghini','huracan','evo-awd',640,600,325,2.9,9.0,'Lamborghini published specifications'),
  ('lamborghini','huracan','sto',640,565,310,3.0,9.0,'Lamborghini published specifications'),
  ('lamborghini','revuelto','revuelto',1015,null,350,2.5,7.0,'Lamborghini published specifications'),
  ('lamborghini','urus','urus-s',666,850,305,3.5,12.5,'Lamborghini published specifications'),

  ('toyota','gr-supra','3-0-automatic',387,500,250,4.1,null,'Toyota published specifications'),
  ('toyota','gr-supra','3-0-manual',387,500,250,4.6,null,'Toyota published specifications'),
  ('toyota','corolla','1-8-hybrid',140,null,180,9.2,null,'Toyota published specifications'),

  ('honda','civic-type-r','type-r',329,420,275,5.4,null,'Honda published specifications'),

  ('nissan','gt-r','premium',570,637,315,null,null,'Nissan published specifications'),
  ('nissan','gt-r','nismo',600,652,315,null,null,'Nissan published specifications'),
  ('nissan','leaf','e-plus',217,340,157,6.9,null,'Nissan published specifications'),

  ('ford','mustang','gt-fastback',486,567,null,null,null,'Ford published specifications (SAE net hp)'),
  ('ford','f-150','3-5-ecoboost',400,678,null,null,null,'Ford published specifications (SAE net hp)'),

  ('tesla','model-3','long-range-awd',null,null,201,4.4,null,'Tesla published specifications'),
  ('tesla','model-3','performance',null,null,261,3.1,null,'Tesla published specifications'),
  ('tesla','model-s','plaid',1020,null,322,2.1,null,'Tesla published specifications'),

  ('mclaren','750s','coupe',750,800,332,2.8,7.2,'McLaren published specifications'),
  ('mclaren','artura','artura',680,720,330,3.0,8.3,'McLaren published specifications'),

  ('jaguar','f-type','r-awd',575,700,300,3.7,null,'Jaguar published specifications'),
  ('jaguar','i-pace','ev400',400,696,200,4.8,null,'Jaguar published specifications'),

  ('renault','clio','tce-90',91,160,180,null,null,'Renault published specifications'),
  ('renault','megane-e-tech','ev60-220',220,300,160,7.4,null,'Renault published specifications'),

  ('peugeot','3008','puretech-130',131,230,188,null,null,'Peugeot published specifications'),
  ('peugeot','208','e-208',136,260,150,null,null,'Peugeot published specifications'),

  ('hyundai','ioniq-5','long-range-awd',325,605,185,5.2,null,'Hyundai published specifications'),
  ('hyundai','creta','1-5-turbo-dct',160,253,null,null,null,'Hyundai published specifications'),

  ('kia','ev6','gt',585,740,260,3.5,null,'Kia published specifications'),
  ('kia','seltos','1-5-turbo-dct',160,253,null,null,null,'Kia published specifications'),

  ('koenigsegg','jesko','absolut',1280,1500,null,null,null,'Koenigsegg published specifications'),

  ('volvo','xc90','t8-recharge',455,709,180,5.4,null,'Volvo Cars published specifications'),
  ('volvo','ex30','twin-motor-performance',428,543,180,3.6,null,'Volvo Cars published specifications'),

  ('byd','seal','awd-performance',530,670,180,3.8,null,'BYD published specifications'),
  ('byd','atto-3','atto-3',204,310,160,7.3,null,'BYD published specifications'),

  ('tata','nexon-ev','long-range',145,215,null,null,null,'Tata Motors published specifications'),
  ('tata','harrier','2-0-diesel',170,350,null,null,null,'Tata Motors published specifications'),
  ('tata','altroz','1-2-petrol',null,null,null,null,null,'Not published with confidence'),

  ('mahindra','thar','2-2-diesel-4wd',132,300,null,null,null,'Mahindra published specifications'),
  ('mahindra','xuv700','ax7-petrol-at',200,380,null,null,null,'Mahindra published specifications'),
  ('mahindra','scorpio-n','z8l-diesel-4wd',175,400,null,null,null,'Mahindra published specifications')
) as v(manufacturer_slug, model_slug, variant_slug, power_hp, torque_nm, top_speed_kmh, zero_to_100_s, zero_to_200_s, source)
join public.manufacturers mf on mf.slug = v.manufacturer_slug
join public.car_models m on m.manufacturer_id = mf.id and m.slug = v.model_slug
join public.car_variants cv on cv.model_id = m.id and cv.slug = v.variant_slug
on conflict (variant_id) do nothing;

-- ---------------------------------------------------------------------------
-- Dimensions
--
-- kerb_weight_kg is NULL for manufacturers that publish dry weight instead
-- (Ferrari, Lamborghini). The dry figure is recorded in notes rather than
-- being silently presented as a kerb weight.
-- ---------------------------------------------------------------------------

insert into public.dimensions (variant_id, length_mm, width_mm, height_mm, wheelbase_mm, kerb_weight_kg, ground_clearance_mm, seating_capacity, source, notes)
select cv.id, v.length_mm, v.width_mm, v.height_mm, v.wheelbase_mm, v.kerb_weight_kg,
       v.ground_clearance_mm, v.seating_capacity, v.source, v.notes
from (values
  ('porsche','911','carrera-s',4519,1852,1300,2450,1515,null,4::smallint,'Porsche published specifications',null),
  ('porsche','911','turbo-s',4535,1900,1303,2450,1640,null,4::smallint,'Porsche published specifications',null),
  ('porsche','911','gt3',4573,1852,1279,2457,1418,null,2::smallint,'Porsche published specifications','Kerb weight quoted for the six-speed manual.'),
  ('porsche','taycan','turbo-s',4963,1966,1378,2900,2295,null,4::smallint,'Porsche published specifications',null),

  ('bmw','m3','m3',4794,1903,1433,2857,1705,null,5::smallint,'BMW M published specifications',null),
  ('bmw','m3','m3-competition',4794,1903,1433,2857,1730,null,5::smallint,'BMW M published specifications',null),
  ('bmw','m3','m3-competition-xdrive',4794,1903,1433,2857,1780,null,5::smallint,'BMW M published specifications',null),
  ('bmw','i4','m50',4783,1852,1448,2856,2215,null,5::smallint,'BMW published specifications',null),

  ('mercedes-benz','amg-gt-4-door','gt-63-s',5054,1953,1447,2951,2045,null,4::smallint,'Mercedes-AMG published specifications',null),
  ('mercedes-benz','eqs','eqs-450-plus',5216,1926,1512,3210,2480,null,5::smallint,'Mercedes-Benz published specifications',null),

  ('audi','rs6-avant','rs6-avant',4995,1951,1460,2925,2075,null,5::smallint,'Audi published specifications',null),
  ('audi','r8','v10-performance-quattro',4426,1940,1240,2650,1695,null,2::smallint,'Audi published specifications',null),

  ('ferrari','296-gtb','296-gtb',4565,1958,1187,2600,null,null,2::smallint,'Ferrari published specifications','Ferrari publishes a dry weight of 1,470 kg. Kerb weight is not published, so it is recorded as unavailable.'),
  ('ferrari','sf90-stradale','sf90-stradale',4710,1972,1186,2650,null,null,2::smallint,'Ferrari published specifications','Ferrari publishes a dry weight of 1,570 kg. Kerb weight is not published.'),
  ('ferrari','f8-tributo','f8-tributo',4611,1979,1206,2650,null,null,2::smallint,'Ferrari published specifications','Ferrari publishes a dry weight of 1,330 kg. Kerb weight is not published.'),

  ('lamborghini','huracan','evo-awd',4520,1933,1165,2620,null,null,2::smallint,'Lamborghini published specifications','Lamborghini publishes a dry weight of 1,422 kg.'),
  ('lamborghini','huracan','sto',4549,1945,1220,2620,null,null,2::smallint,'Lamborghini published specifications','Lamborghini publishes a dry weight of 1,339 kg.'),
  ('lamborghini','revuelto','revuelto',4947,2033,1160,2779,null,null,2::smallint,'Lamborghini published specifications','Lamborghini publishes a dry weight of 1,772 kg.'),
  ('lamborghini','urus','urus-s',5137,2016,1638,3003,2197,null,5::smallint,'Lamborghini published specifications',null),

  ('toyota','gr-supra','3-0-automatic',4380,1865,1295,2470,1520,null,2::smallint,'Toyota published specifications',null),
  ('toyota','gr-supra','3-0-manual',4380,1865,1295,2470,1495,null,2::smallint,'Toyota published specifications',null),
  ('toyota','corolla','1-8-hybrid',4630,1780,1435,2700,1395,null,5::smallint,'Toyota published specifications',null),

  ('honda','civic-type-r','type-r',4595,1890,1407,2735,1429,null,4::smallint,'Honda published specifications',null),

  ('nissan','gt-r','premium',4710,1895,1370,2780,1752,null,4::smallint,'Nissan published specifications',null),
  ('nissan','gt-r','nismo',4690,1895,1370,2780,1720,null,2::smallint,'Nissan published specifications',null),
  ('nissan','leaf','e-plus',4490,1788,1540,2700,1736,null,5::smallint,'Nissan published specifications',null),

  ('ford','mustang','gt-fastback',4811,1915,1400,2720,null,null,4::smallint,'Ford published specifications','Kerb weight varies with equipment and is not published as a single figure for this variant.'),
  ('ford','f-150','3-5-ecoboost',null,null,null,null,null,null,null::smallint,'Ford published specifications','Dimensions vary substantially with cab and bed configuration; no single figure applies.'),

  ('tesla','model-3','long-range-awd',4720,1933,1441,2875,1823,null,5::smallint,'Tesla published specifications',null),
  ('tesla','model-3','performance',4720,1933,1441,2875,1856,null,5::smallint,'Tesla published specifications',null),
  ('tesla','model-s','plaid',4979,1964,1445,2960,2190,null,5::smallint,'Tesla published specifications',null),

  ('mclaren','750s','coupe',4569,1930,1196,2670,1389,null,2::smallint,'McLaren published specifications','DIN kerb weight including fluids. McLaren separately quotes a lightest dry weight of 1,277 kg.'),
  ('mclaren','artura','artura',4539,1913,1193,2640,1498,null,2::smallint,'McLaren published specifications','DIN kerb weight including fluids.'),

  ('jaguar','f-type','r-awd',4470,1923,1311,2622,1743,null,2::smallint,'Jaguar published specifications',null),
  ('jaguar','i-pace','ev400',4682,2011,1565,2990,2208,null,5::smallint,'Jaguar published specifications',null),

  ('renault','clio','tce-90',4053,1798,1440,2583,1178,null,5::smallint,'Renault published specifications',null),
  ('renault','megane-e-tech','ev60-220',4200,1768,1505,2685,1636,null,5::smallint,'Renault published specifications',null),

  ('peugeot','3008','puretech-130',4447,1841,1620,2675,1320,null,5::smallint,'Peugeot published specifications',null),
  ('peugeot','208','e-208',4055,1745,1430,2540,1530,null,5::smallint,'Peugeot published specifications',null),

  ('hyundai','ioniq-5','long-range-awd',4635,1890,1605,3000,2100,null,5::smallint,'Hyundai published specifications',null),
  ('hyundai','creta','1-5-turbo-dct',4330,1790,1635,2610,null,190,5::smallint,'Hyundai published specifications','Kerb weight is not published per variant.'),

  ('kia','ev6','gt',4695,1890,1545,2900,2180,null,5::smallint,'Kia published specifications',null),
  ('kia','seltos','1-5-turbo-dct',4365,1800,1645,2610,null,190,5::smallint,'Kia published specifications','Kerb weight is not published per variant.'),

  ('koenigsegg','jesko','absolut',4885,2030,1210,2700,null,null,2::smallint,'Koenigsegg published specifications','Koenigsegg publishes a dry weight of 1,320 kg.'),

  ('volvo','xc90','t8-recharge',4953,1958,1776,2984,2286,null,7::smallint,'Volvo Cars published specifications',null),
  ('volvo','ex30','twin-motor-performance',4233,1837,1549,2650,1830,null,5::smallint,'Volvo Cars published specifications',null),

  ('byd','seal','awd-performance',4800,1875,1460,2920,2185,null,5::smallint,'BYD published specifications',null),
  ('byd','atto-3','atto-3',4455,1875,1615,2720,1750,null,5::smallint,'BYD published specifications',null),

  ('tata','nexon-ev','long-range',3995,1811,1616,2498,null,205,5::smallint,'Tata Motors published specifications','Kerb weight is not published per variant.'),
  ('tata','harrier','2-0-diesel',4605,1894,1706,2741,1675,205,5::smallint,'Tata Motors published specifications',null),
  ('tata','altroz','1-2-petrol',3990,1755,1523,2501,null,165,5::smallint,'Tata Motors published specifications','Kerb weight is not published per variant.'),

  ('mahindra','thar','2-2-diesel-4wd',3985,1820,1844,2450,null,226,4::smallint,'Mahindra published specifications','Kerb weight varies by roof and trim; not published as a single figure.'),
  ('mahindra','xuv700','ax7-petrol-at',4695,1890,1755,2750,null,200,7::smallint,'Mahindra published specifications','Kerb weight is not published per variant.'),
  ('mahindra','scorpio-n','z8l-diesel-4wd',4662,1917,1857,2750,null,187,7::smallint,'Mahindra published specifications','Kerb weight is not published per variant.')
) as v(manufacturer_slug, model_slug, variant_slug, length_mm, width_mm, height_mm, wheelbase_mm, kerb_weight_kg, ground_clearance_mm, seating_capacity, source, notes)
join public.manufacturers mf on mf.slug = v.manufacturer_slug
join public.car_models m on m.manufacturer_id = mf.id and m.slug = v.model_slug
join public.car_variants cv on cv.model_id = m.id and cv.slug = v.variant_slug
on conflict (variant_id) do nothing;

-- ---------------------------------------------------------------------------
-- Fuel specifications (ICE, hybrid and PHEV only)
--
-- mileage_kmpl is NULL throughout. European and American makers publish
-- consumption in l/100 km or mpg, and Indian ARAI figures differ by variant
-- and model year. Converting or approximating either would breach the
-- data-honesty rule, so the field is left for an authoritative source.
-- ---------------------------------------------------------------------------

insert into public.fuel_specs (variant_id, tank_capacity_l, mileage_kmpl, source, notes)
select cv.id, v.tank_capacity_l, null::numeric, v.source, v.notes
from (values
  ('porsche','911','carrera-s',67.0,'Porsche published specifications','Consumption is published in l/100 km and has not been converted.'),
  ('porsche','911','turbo-s',67.0,'Porsche published specifications','Consumption is published in l/100 km.'),
  ('porsche','911','gt3',64.0,'Porsche published specifications','Consumption is published in l/100 km.'),
  ('bmw','m3','m3',59.0,'BMW M published specifications','Consumption is published in l/100 km.'),
  ('bmw','m3','m3-competition',59.0,'BMW M published specifications','Consumption is published in l/100 km.'),
  ('bmw','m3','m3-competition-xdrive',59.0,'BMW M published specifications','Consumption is published in l/100 km.'),
  ('mercedes-benz','amg-gt-4-door','gt-63-s',80.0,'Mercedes-AMG published specifications','Consumption is published in l/100 km.'),
  ('audi','rs6-avant','rs6-avant',73.0,'Audi published specifications','Consumption is published in l/100 km.'),
  ('audi','r8','v10-performance-quattro',83.0,'Audi published specifications','Consumption is published in l/100 km.'),
  ('ferrari','296-gtb','296-gtb',65.0,'Ferrari published specifications','Consumption is published in l/100 km.'),
  ('ferrari','sf90-stradale','sf90-stradale',68.0,'Ferrari published specifications','Consumption is published in l/100 km.'),
  ('ferrari','f8-tributo','f8-tributo',78.0,'Ferrari published specifications','Consumption is published in l/100 km.'),
  ('lamborghini','huracan','evo-awd',83.0,'Lamborghini published specifications','Consumption is published in l/100 km.'),
  ('lamborghini','huracan','sto',83.0,'Lamborghini published specifications','Consumption is published in l/100 km.'),
  ('lamborghini','urus','urus-s',85.0,'Lamborghini published specifications','Consumption is published in l/100 km.'),
  ('toyota','gr-supra','3-0-automatic',52.0,'Toyota published specifications','Consumption is published in l/100 km.'),
  ('toyota','gr-supra','3-0-manual',52.0,'Toyota published specifications','Consumption is published in l/100 km.'),
  ('toyota','corolla','1-8-hybrid',43.0,'Toyota published specifications','Consumption is published in l/100 km.'),
  ('honda','civic-type-r','type-r',47.0,'Honda published specifications','Consumption is published in l/100 km.'),
  ('nissan','gt-r','premium',74.0,'Nissan published specifications','Consumption is published in l/100 km.'),
  ('nissan','gt-r','nismo',74.0,'Nissan published specifications','Consumption is published in l/100 km.'),
  ('ford','mustang','gt-fastback',60.5,'Ford published specifications','Consumption is published in US mpg and has not been converted.'),
  ('ford','f-150','3-5-ecoboost',null,'Ford published specifications','Tank capacity varies with configuration.'),
  ('mclaren','750s','coupe',72.0,'McLaren published specifications','Consumption is published in l/100 km.'),
  ('mclaren','artura','artura',65.0,'McLaren published specifications','Consumption is published in l/100 km.'),
  ('jaguar','f-type','r-awd',70.0,'Jaguar published specifications','Consumption is published in l/100 km.'),
  ('renault','clio','tce-90',42.0,'Renault published specifications','Consumption is published in l/100 km.'),
  ('peugeot','3008','puretech-130',53.0,'Peugeot published specifications','Consumption is published in l/100 km.'),
  ('hyundai','creta','1-5-turbo-dct',50.0,'Hyundai published specifications','ARAI figures vary by variant and model year.'),
  ('kia','seltos','1-5-turbo-dct',50.0,'Kia published specifications','ARAI figures vary by variant and model year.'),
  ('koenigsegg','jesko','absolut',null,null,'Tank capacity is not published.'),
  ('volvo','xc90','t8-recharge',71.0,'Volvo Cars published specifications','Consumption is published in l/100 km.'),
  ('tata','harrier','2-0-diesel',50.0,'Tata Motors published specifications','ARAI figures vary by variant.'),
  ('tata','altroz','1-2-petrol',37.0,'Tata Motors published specifications','ARAI figures vary by variant.'),
  ('mahindra','thar','2-2-diesel-4wd',57.0,'Mahindra published specifications','ARAI figures vary by variant.'),
  ('mahindra','xuv700','ax7-petrol-at',60.0,'Mahindra published specifications','ARAI figures vary by variant.'),
  ('mahindra','scorpio-n','z8l-diesel-4wd',57.0,'Mahindra published specifications','ARAI figures vary by variant.')
) as v(manufacturer_slug, model_slug, variant_slug, tank_capacity_l, source, notes)
join public.manufacturers mf on mf.slug = v.manufacturer_slug
join public.car_models m on m.manufacturer_id = mf.id and m.slug = v.model_slug
join public.car_variants cv on cv.model_id = m.id and cv.slug = v.variant_slug
on conflict (variant_id) do nothing;

-- ---------------------------------------------------------------------------
-- EV specifications (electric, PHEV and hybrid)
-- ---------------------------------------------------------------------------

insert into public.ev_specs (variant_id, battery_kwh, usable_battery_kwh, range_km, range_standard, max_charge_kw, motor_count, source, notes)
select cv.id, v.battery_kwh, v.usable_battery_kwh, v.range_km,
       v.range_standard::public.range_standard, v.max_charge_kw, v.motor_count, v.source, v.notes
from (values
  ('porsche','taycan','turbo-s',93.40,83.70,412,'wltp',270,2::smallint,'Porsche published specifications',null),
  ('bmw','i4','m50',83.90,80.70,510,'wltp',205,2::smallint,'BMW published specifications','WLTP range is the maximum of the published band and varies with wheel size.'),
  ('mercedes-benz','eqs','eqs-450-plus',null,107.80,784,'wltp',200,1::smallint,'Mercedes-Benz published specifications','Mercedes publishes usable capacity only. WLTP range is the maximum of the published band.'),
  ('ferrari','296-gtb','296-gtb',7.45,null,25,'wltp',null,1::smallint,'Ferrari published specifications','Electric-only range.'),
  ('ferrari','sf90-stradale','sf90-stradale',7.90,null,25,'wltp',null,3::smallint,'Ferrari published specifications','Electric-only range. Two motors drive the front axle, one is integrated at the rear.'),
  ('lamborghini','revuelto','revuelto',3.80,null,10,'wltp',null,3::smallint,'Lamborghini published specifications','Electric-only range is very short; the battery is sized for performance assistance rather than electric running.'),
  ('toyota','corolla','1-8-hybrid',null,null,null,null,null,null::smallint,'Toyota published specifications','A self-charging hybrid with a small buffer battery. Toyota does not publish its usable capacity, and the car has no meaningful electric-only range, so both are recorded as unavailable.'),
  ('nissan','leaf','e-plus',62.00,null,385,'wltp',100,1::smallint,'Nissan published specifications','The pack is passively air-cooled, which limits repeated rapid charging.'),
  ('tesla','model-3','long-range-awd',null,null,629,'wltp',250,2::smallint,'Tesla published specifications','Tesla does not publish battery capacity.'),
  ('tesla','model-3','performance',null,null,528,'wltp',250,2::smallint,'Tesla published specifications','Tesla does not publish battery capacity.'),
  ('tesla','model-s','plaid',null,null,600,'wltp',250,3::smallint,'Tesla published specifications','Tesla does not publish battery capacity.'),
  ('mclaren','artura','artura',7.40,null,31,'wltp',null,1::smallint,'McLaren published specifications','Electric-only range.'),
  ('jaguar','i-pace','ev400',90.00,84.70,470,'wltp',100,2::smallint,'Jaguar published specifications',null),
  ('renault','megane-e-tech','ev60-220',60.00,null,470,'wltp',130,1::smallint,'Renault published specifications',null),
  ('peugeot','208','e-208',50.00,null,362,'wltp',100,1::smallint,'Peugeot published specifications',null),
  ('hyundai','ioniq-5','long-range-awd',77.40,null,481,'wltp',350,2::smallint,'Hyundai published specifications','800-volt architecture allows 10-80% charging in approximately 18 minutes.'),
  ('kia','ev6','gt',77.40,null,424,'wltp',350,2::smallint,'Kia published specifications',null),
  ('volvo','xc90','t8-recharge',18.80,null,71,'wltp',null,1::smallint,'Volvo Cars published specifications','Electric-only range.'),
  ('volvo','ex30','twin-motor-performance',69.00,64.00,450,'wltp',153,2::smallint,'Volvo Cars published specifications',null),
  ('byd','seal','awd-performance',82.50,null,520,'wltp',150,2::smallint,'BYD published specifications',null),
  ('byd','atto-3','atto-3',60.48,null,420,'wltp',88,1::smallint,'BYD published specifications',null),
  ('tata','nexon-ev','long-range',40.50,null,465,'arai',null,1::smallint,'Tata Motors published specifications','Range is the MIDC/ARAI certified figure, measured on a different cycle from WLTP and not directly comparable.')
) as v(manufacturer_slug, model_slug, variant_slug, battery_kwh, usable_battery_kwh, range_km, range_standard, max_charge_kw, motor_count, source, notes)
join public.manufacturers mf on mf.slug = v.manufacturer_slug
join public.car_models m on m.manufacturer_id = mf.id and m.slug = v.model_slug
join public.car_variants cv on cv.model_id = m.id and cv.slug = v.variant_slug
on conflict (variant_id) do nothing;
-- ---------------------------------------------------------------------------
-- Part relations
--
-- Stored as one canonical row per unordered pair. least()/greatest() satisfy
-- the part_relations_canonical_order CHECK regardless of which way round the
-- pair is written here.
-- ---------------------------------------------------------------------------

insert into public.part_relations (part_id, related_part_id)
select least(p1.id, p2.id), greatest(p1.id, p2.id)
from (values
  ('turbocharger','intercooler'),
  ('turbocharger','exhaust-manifold'),
  ('turbocharger','throttle-body'),
  ('supercharger','intercooler'),
  ('cylinder-block','cylinder-head'),
  ('cylinder-block','piston'),
  ('cylinder-block','crankshaft'),
  ('piston','connecting-rod'),
  ('connecting-rod','crankshaft'),
  ('cylinder-head','camshaft'),
  ('camshaft','valve'),
  ('valve','exhaust-manifold'),
  ('fuel-injector','throttle-body'),
  ('exhaust-manifold','catalytic-converter'),
  ('radiator','oil-pump'),
  ('clutch','manual-gearbox'),
  ('manual-gearbox','driveshaft'),
  ('dual-clutch-transmission','driveshaft'),
  ('torque-converter','manual-gearbox'),
  ('driveshaft','differential'),
  ('differential','cv-joint'),
  ('cv-joint','wheel-hub'),
  ('transfer-case','differential'),
  ('macpherson-strut','coil-spring'),
  ('macpherson-strut','damper'),
  ('double-wishbone','coil-spring'),
  ('multi-link-suspension','damper'),
  ('coil-spring','damper'),
  ('damper','anti-roll-bar'),
  ('air-spring','damper'),
  ('brake-disc','brake-caliper'),
  ('brake-caliper','brake-pad'),
  ('brake-disc','brake-pad'),
  ('brake-master-cylinder','abs-module'),
  ('abs-module','brake-caliper'),
  ('carbon-ceramic-disc','brake-pad'),
  ('carbon-ceramic-disc','brake-disc'),
  ('alloy-wheel','tyre'),
  ('alloy-wheel','wheel-hub'),
  ('wheel-hub','wheel-bearing'),
  ('tyre','tpms-sensor'),
  ('wheel-hub','brake-disc'),
  ('steering-wheel','airbag'),
  ('dashboard','infotainment-unit'),
  ('dashboard','airbag'),
  ('pedal-box','brake-master-cylinder'),
  ('alternator','auxiliary-battery'),
  ('starter-motor','auxiliary-battery'),
  ('engine-control-unit','sensor-suite'),
  ('engine-control-unit','fuel-injector'),
  ('engine-control-unit','throttle-body'),
  ('wiring-harness','engine-control-unit'),
  ('sensor-suite','abs-module'),
  ('traction-battery-pack','battery-module'),
  ('traction-battery-pack','battery-management-system'),
  ('battery-module','battery-management-system'),
  ('traction-battery-pack','battery-thermal-management'),
  ('traction-battery-pack','inverter'),
  ('inverter','electric-traction-motor'),
  ('electric-traction-motor','regenerative-braking-system'),
  ('regenerative-braking-system','abs-module'),
  ('on-board-charger','traction-battery-pack'),
  ('battery-management-system','battery-thermal-management')
) as v(a, b)
join public.parts p1 on p1.slug = v.a
join public.parts p2 on p2.slug = v.b
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Features
-- ---------------------------------------------------------------------------

insert into public.features (name, slug, category, description) values
('Adaptive Damping', 'adaptive-damping', 'Chassis', 'Electronically controlled dampers that vary their damping rate continuously in response to road surface, speed and driver inputs.'),
('Air Suspension', 'air-suspension', 'Chassis', 'Air springs in place of steel, allowing ride height and effective spring rate to be varied.'),
('Rear-Wheel Steering', 'rear-wheel-steering', 'Chassis', 'Steers the rear wheels by a few degrees — opposite to the fronts at low speed to reduce the turning circle, and in phase at high speed for stability.'),
('Torque Vectoring', 'torque-vectoring', 'Drivetrain', 'Actively varies torque between left and right wheels to help rotate the car into a corner.'),
('Limited-Slip Differential', 'limited-slip-differential', 'Drivetrain', 'Restricts the speed difference between driven wheels so that a wheel with little grip cannot absorb all the torque.'),
('Launch Control', 'launch-control', 'Drivetrain', 'Manages engine speed and clutch or motor engagement to produce a repeatable maximum-traction standing start.'),
('Carbon-Ceramic Brakes', 'carbon-ceramic-brakes', 'Braking', 'Carbon-fibre-reinforced silicon-carbide discs, roughly half the weight of iron with far greater fade resistance.'),
('Active Aerodynamics', 'active-aerodynamics', 'Aerodynamics', 'Movable aerodynamic surfaces that trade downforce against drag according to conditions, and can act as an airbrake.'),
('All-Wheel Drive', 'all-wheel-drive', 'Drivetrain', 'Drive delivered to all four wheels, either permanently or on demand.'),
('Low-Range Transfer Case', 'low-range-transfer-case', 'Drivetrain', 'A secondary gear set that multiplies torque for steep climbs and controlled descents off-road.'),
('Locking Differential', 'locking-differential', 'Drivetrain', 'Mechanically locks a differential so both wheels turn at the same speed regardless of grip.'),
('Vehicle-to-Load', 'vehicle-to-load', 'EV', 'Allows the traction battery to supply mains-voltage power to external equipment.'),
('800-Volt Architecture', '800-volt-architecture', 'EV', 'A higher-voltage electrical system that permits very high charging rates and lighter cabling.'),
('Heat Pump', 'heat-pump', 'EV', 'Moves heat rather than generating it, substantially reducing the range penalty of cabin heating in cold weather.'),
('Adaptive Cruise Control', 'adaptive-cruise-control', 'Driver Assistance', 'Maintains a set speed and a set distance from the vehicle ahead.'),
('Lane Keeping Assist', 'lane-keeping-assist', 'Driver Assistance', 'Applies steering correction to keep the car within its lane markings.'),
('Matrix LED Headlights', 'matrix-led-headlights', 'Lighting', 'Individually switchable LED segments that keep main beam on while masking oncoming vehicles.'),
('Head-Up Display', 'head-up-display', 'Interior', 'Projects speed and navigation information onto the windscreen in the driver''s line of sight.')
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Variant features (a representative sample, not exhaustive)
-- ---------------------------------------------------------------------------

insert into public.variant_features (variant_id, feature_id, detail)
select cv.id, f.id, v.detail
from (values
  ('porsche','911','turbo-s','carbon-ceramic-brakes','Porsche Ceramic Composite Brakes fitted as standard.'),
  ('porsche','911','turbo-s','rear-wheel-steering',null),
  ('porsche','911','turbo-s','active-aerodynamics','Adaptive rear wing doubles as an airbrake.'),
  ('porsche','911','turbo-s','all-wheel-drive',null),
  ('porsche','911','turbo-s','launch-control',null),
  ('porsche','911','gt3','active-aerodynamics','Manually adjustable swan-neck rear wing.'),
  ('porsche','911','carrera-s','adaptive-damping','Porsche Active Suspension Management.'),
  ('porsche','taycan','turbo-s','air-suspension',null),
  ('porsche','taycan','turbo-s','800-volt-architecture',null),
  ('porsche','taycan','turbo-s','all-wheel-drive',null),

  ('bmw','m3','m3-competition','adaptive-damping',null),
  ('bmw','m3','m3-competition','limited-slip-differential','Active M Differential.'),
  ('bmw','m3','m3-competition-xdrive','all-wheel-drive','M xDrive, with a fully rear-drive 2WD mode.'),
  ('bmw','m3','m3-competition-xdrive','torque-vectoring',null),
  ('bmw','i4','m50','adaptive-damping',null),
  ('bmw','i4','m50','all-wheel-drive',null),
  ('bmw','i4','m50','heat-pump',null),

  ('mercedes-benz','amg-gt-4-door','gt-63-s','rear-wheel-steering',null),
  ('mercedes-benz','amg-gt-4-door','gt-63-s','all-wheel-drive','Fully variable AMG Performance 4MATIC+.'),
  ('mercedes-benz','amg-gt-4-door','gt-63-s','air-suspension',null),
  ('mercedes-benz','eqs','eqs-450-plus','heat-pump',null),
  ('mercedes-benz','eqs','eqs-450-plus','air-suspension',null),
  ('mercedes-benz','eqs','eqs-450-plus','rear-wheel-steering',null),

  ('audi','rs6-avant','rs6-avant','air-suspension',null),
  ('audi','rs6-avant','rs6-avant','all-wheel-drive','quattro permanent all-wheel drive.'),
  ('audi','rs6-avant','rs6-avant','matrix-led-headlights',null),
  ('audi','r8','v10-performance-quattro','all-wheel-drive',null),
  ('audi','r8','v10-performance-quattro','carbon-ceramic-brakes',null),

  ('ferrari','296-gtb','296-gtb','active-aerodynamics','Active rear spoiler integrated into the bumper.'),
  ('ferrari','296-gtb','296-gtb','carbon-ceramic-brakes',null),
  ('ferrari','296-gtb','296-gtb','launch-control',null),
  ('ferrari','sf90-stradale','sf90-stradale','all-wheel-drive','Front axle driven by two independent electric motors.'),
  ('ferrari','sf90-stradale','sf90-stradale','torque-vectoring','Achieved electrically across the front axle.'),
  ('ferrari','sf90-stradale','sf90-stradale','carbon-ceramic-brakes',null),
  ('ferrari','f8-tributo','f8-tributo','carbon-ceramic-brakes',null),

  ('lamborghini','huracan','evo-awd','all-wheel-drive',null),
  ('lamborghini','huracan','evo-awd','rear-wheel-steering',null),
  ('lamborghini','huracan','sto','carbon-ceramic-brakes','CCM-R discs derived from motorsport.'),
  ('lamborghini','huracan','sto','active-aerodynamics',null),
  ('lamborghini','revuelto','revuelto','all-wheel-drive',null),
  ('lamborghini','revuelto','revuelto','torque-vectoring',null),
  ('lamborghini','urus','urus-s','air-suspension',null),
  ('lamborghini','urus','urus-s','rear-wheel-steering',null),
  ('lamborghini','urus','urus-s','carbon-ceramic-brakes',null),
  ('lamborghini','urus','urus-s','torque-vectoring',null),

  ('toyota','gr-supra','3-0-automatic','adaptive-damping',null),
  ('toyota','gr-supra','3-0-automatic','limited-slip-differential','Electronically controlled rear differential.'),
  ('honda','civic-type-r','type-r','limited-slip-differential','Helical limited-slip front differential.'),
  ('honda','civic-type-r','type-r','adaptive-damping',null),

  ('nissan','gt-r','premium','all-wheel-drive','ATTESA E-TS, biased rearward until slip is detected.'),
  ('nissan','gt-r','nismo','carbon-ceramic-brakes',null),
  ('nissan','gt-r','nismo','all-wheel-drive',null),

  ('tesla','model-3','performance','adaptive-damping',null),
  ('tesla','model-3','performance','all-wheel-drive',null),
  ('tesla','model-s','plaid','all-wheel-drive','Three motors: one front, two rear.'),
  ('tesla','model-s','plaid','torque-vectoring','Independent rear motors allow true torque vectoring.'),
  ('tesla','model-s','plaid','heat-pump',null),

  ('mclaren','750s','coupe','active-aerodynamics','Active rear wing functioning as an airbrake.'),
  ('mclaren','750s','coupe','carbon-ceramic-brakes',null),
  ('mclaren','artura','artura','limited-slip-differential','Electronically controlled differential.'),
  ('mclaren','artura','artura','carbon-ceramic-brakes',null),

  ('jaguar','f-type','r-awd','all-wheel-drive',null),
  ('jaguar','f-type','r-awd','limited-slip-differential','Electronic active differential.'),
  ('jaguar','i-pace','ev400','air-suspension',null),
  ('jaguar','i-pace','ev400','all-wheel-drive',null),

  ('hyundai','ioniq-5','long-range-awd','800-volt-architecture',null),
  ('hyundai','ioniq-5','long-range-awd','vehicle-to-load',null),
  ('hyundai','ioniq-5','long-range-awd','all-wheel-drive',null),
  ('hyundai','ioniq-5','long-range-awd','heat-pump',null),
  ('kia','ev6','gt','800-volt-architecture',null),
  ('kia','ev6','gt','all-wheel-drive',null),
  ('kia','ev6','gt','limited-slip-differential','Electronic limited-slip differential on the rear axle.'),

  ('koenigsegg','jesko','absolut','launch-control',null),
  ('koenigsegg','jesko','absolut','carbon-ceramic-brakes',null),

  ('volvo','xc90','t8-recharge','air-suspension',null),
  ('volvo','xc90','t8-recharge','all-wheel-drive','Petrol engine drives the front axle, electric motor the rear.'),
  ('volvo','xc90','t8-recharge','adaptive-cruise-control',null),
  ('volvo','ex30','twin-motor-performance','all-wheel-drive',null),
  ('volvo','ex30','twin-motor-performance','heat-pump',null),

  ('byd','seal','awd-performance','all-wheel-drive',null),
  ('byd','seal','awd-performance','heat-pump',null),

  ('mahindra','thar','2-2-diesel-4wd','low-range-transfer-case',null),
  ('mahindra','thar','2-2-diesel-4wd','locking-differential','Mechanical locking rear differential.'),
  ('mahindra','xuv700','ax7-petrol-at','adaptive-cruise-control',null),
  ('mahindra','xuv700','ax7-petrol-at','lane-keeping-assist',null),
  ('mahindra','scorpio-n','z8l-diesel-4wd','low-range-transfer-case',null),

  ('tata','harrier','2-0-diesel','adaptive-cruise-control',null),
  ('tata','nexon-ev','long-range','vehicle-to-load',null)
) as v(manufacturer_slug, model_slug, variant_slug, feature_slug, detail)
join public.manufacturers mf on mf.slug = v.manufacturer_slug
join public.car_models m on m.manufacturer_id = mf.id and m.slug = v.model_slug
join public.car_variants cv on cv.model_id = m.id and cv.slug = v.variant_slug
join public.features f on f.slug = v.feature_slug
on conflict (variant_id, feature_id) do nothing;

-- ---------------------------------------------------------------------------
-- Variant-specific part notes (a representative sample)
-- ---------------------------------------------------------------------------

insert into public.variant_parts (variant_id, part_id, detail)
select cv.id, p.id, v.detail
from (values
  ('porsche','911','gt3','double-wishbone','Double-wishbone front suspension adapted from the 911 RSR race car, replacing the MacPherson strut used elsewhere in the 911 range.'),
  ('porsche','911','gt3','rear-spoiler','Swan-neck rear wing, mounted from above so the airflow across the wing''s lower surface is undisturbed.'),
  ('porsche','911','turbo-s','carbon-ceramic-disc','420 mm front and 390 mm rear carbon-ceramic discs.'),
  ('porsche','taycan','turbo-s','traction-battery-pack','Performance Battery Plus, 93.4 kWh gross, in an 800-volt architecture.'),
  ('bmw','m3','m3-competition','cylinder-block','Closed-deck S58 block with a forged crankshaft and a 3D-printed cylinder head core.'),
  ('ferrari','296-gtb','296-gtb','turbocharger','Twin turbochargers mounted inside the 120-degree vee, shortening the gas path.'),
  ('ferrari','sf90-stradale','sf90-stradale','electric-traction-motor','Two independent front motors provide all-wheel drive and electric torque vectoring; a third is integrated at the rear.'),
  ('lamborghini','huracan','sto','brake-disc','CCM-R carbon-ceramic discs using material derived from motorsport, with substantially greater thermal conductivity than standard carbon-ceramics.'),
  ('lamborghini','revuelto','revuelto','cylinder-block','An entirely new V12 rather than a development of the Aventador unit, rotated 180 degrees and mated to an all-new gearbox mounted behind it.'),
  ('nissan','gt-r','premium','dual-clutch-transmission','Rear-mounted GR6 transaxle, which shifts weight rearward and improves balance.'),
  ('nissan','gt-r','premium','cylinder-head','Each VR38DETT is hand-assembled in a clean room by a single Takumi technician, whose name appears on a plaque on the plenum.'),
  ('mclaren','750s','coupe','rear-spoiler','Active rear wing that also serves as an airbrake under heavy braking.'),
  ('mclaren','artura','artura','dual-clutch-transmission','Eight-speed unit with no reverse gear; the car reverses on its electric motor.'),
  ('honda','civic-type-r','type-r','macpherson-strut','Dual-axis front strut, which separates steering and suspension loads to suppress torque steer.'),
  ('tesla','model-s','plaid','electric-traction-motor','Carbon-sleeved rotors contain the magnets against the forces generated at very high rotational speed.'),
  ('hyundai','ioniq-5','long-range-awd','on-board-charger','Supports vehicle-to-load output, supplying mains voltage from the traction pack.'),
  ('byd','atto-3','atto-3','traction-battery-pack','Blade lithium-iron-phosphate pack, using long prismatic cells arranged to form part of the pack structure.'),
  ('byd','seal','awd-performance','traction-battery-pack','Cell-to-body construction: the pack forms part of the car''s structure rather than being carried within it.'),
  ('mahindra','thar','2-2-diesel-4wd','transfer-case','Low-range transfer case with a mechanically locking rear differential.'),
  ('volvo','xc90','t8-recharge','electric-traction-motor','Drives the rear axle only; there is no mechanical connection between it and the front-mounted petrol engine.')
) as v(manufacturer_slug, model_slug, variant_slug, part_slug, detail)
join public.manufacturers mf on mf.slug = v.manufacturer_slug
join public.car_models m on m.manufacturer_id = mf.id and m.slug = v.model_slug
join public.car_variants cv on cv.model_id = m.id and cv.slug = v.variant_slug
join public.parts p on p.slug = v.part_slug
on conflict (variant_id, part_id) do nothing;

-- ===========================================================================
-- Migration 0008 onwards: markets, exhaust group, generations
--
-- Guarded so this file still runs against a database that has not had the
-- later migrations applied. Every statement is idempotent.
--
-- DATA HONESTY: geography and currencies are facts; NO prices, colours or
-- availability are seeded. Those are added through /admin with a source, a
-- source URL and a verification date.
-- ===========================================================================

do $do$
begin
  -- Currencies prices are quoted in, per market.
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'countries'
               and column_name = 'currency_code') then
    update public.countries c
       set currency_code = v.code
      from (values
        ('CN', 'CNY'), ('FR', 'EUR'), ('DE', 'EUR'), ('IN', 'INR'), ('IT', 'EUR'),
        ('JP', 'JPY'), ('KR', 'KRW'), ('SE', 'SEK'), ('GB', 'GBP'), ('US', 'USD')
      ) as v(iso, code)
     where c.iso_code = v.iso
       and c.currency_code is distinct from v.code;
  end if;

  -- India: states / union territories and cities for on-road pricing.
  if to_regclass('public.market_regions') is not null then
    insert into public.market_regions (country_id, name, slug, display_order)
    select co.id, v.name, v.slug::public.slug, v.ord::smallint
    from (values
      ('Maharashtra', 'maharashtra', 1),
      ('Delhi', 'delhi', 2),
      ('Karnataka', 'karnataka', 3),
      ('Tamil Nadu', 'tamil-nadu', 4),
      ('Telangana', 'telangana', 5),
      ('West Bengal', 'west-bengal', 6),
      ('Gujarat', 'gujarat', 7),
      ('Haryana', 'haryana', 8),
      ('Uttar Pradesh', 'uttar-pradesh', 9),
      ('Rajasthan', 'rajasthan', 10),
      ('Kerala', 'kerala', 11),
      ('Madhya Pradesh', 'madhya-pradesh', 12),
      ('Punjab', 'punjab', 13),
      ('Chandigarh', 'chandigarh', 14)
    ) as v(name, slug, ord)
    cross join public.countries co
    where co.iso_code = 'IN'
    on conflict (country_id, slug) do nothing;

    insert into public.market_cities (region_id, name, slug, display_order)
    select r.id, v.name, v.slug::public.slug, v.ord::smallint
    from (values
      ('maharashtra', 'Mumbai', 'mumbai', 1),
      ('maharashtra', 'Pune', 'pune', 2),
      ('maharashtra', 'Nagpur', 'nagpur', 3),
      ('delhi', 'New Delhi', 'new-delhi', 1),
      ('karnataka', 'Bengaluru', 'bengaluru', 1),
      ('karnataka', 'Mysuru', 'mysuru', 2),
      ('tamil-nadu', 'Chennai', 'chennai', 1),
      ('tamil-nadu', 'Coimbatore', 'coimbatore', 2),
      ('telangana', 'Hyderabad', 'hyderabad', 1),
      ('west-bengal', 'Kolkata', 'kolkata', 1),
      ('gujarat', 'Ahmedabad', 'ahmedabad', 1),
      ('gujarat', 'Surat', 'surat', 2),
      ('haryana', 'Gurugram', 'gurugram', 1),
      ('uttar-pradesh', 'Lucknow', 'lucknow', 1),
      ('uttar-pradesh', 'Noida', 'noida', 2),
      ('rajasthan', 'Jaipur', 'jaipur', 1),
      ('kerala', 'Kochi', 'kochi', 1),
      ('kerala', 'Thiruvananthapuram', 'thiruvananthapuram', 2),
      ('madhya-pradesh', 'Indore', 'indore', 1),
      ('madhya-pradesh', 'Bhopal', 'bhopal', 2),
      ('punjab', 'Ludhiana', 'ludhiana', 1),
      ('chandigarh', 'Chandigarh', 'chandigarh', 1)
    ) as v(region_slug, name, slug, ord)
    join public.market_regions r on r.slug = v.region_slug
    join public.countries co on co.id = r.country_id and co.iso_code = 'IN'
    on conflict (region_id, slug) do nothing;
  end if;

  -- Generations from the free-text column (see migration 0008).
  if to_regclass('public.car_generations') is not null then
    insert into public.car_generations (model_id, name, slug, year_start, year_end)
    select m.id, trim(m.generation), g.slug, m.production_start, m.production_end
    from public.car_models m
    cross join lateral (
      select lower(regexp_replace(regexp_replace(trim(m.generation), '[^A-Za-z0-9]+', '-', 'g'),
                                  '(^-+|-+$)', '', 'g')) as slug
    ) g
    where m.generation is not null and g.slug <> ''
    on conflict (model_id, slug) do nothing;

    update public.car_variants v
       set generation_id = g.id
      from public.car_generations g
      join public.car_models m on m.id = g.model_id
     where v.model_id = m.id
       and v.generation_id is null
       and g.name = trim(m.generation);
  end if;
end;
$do$;

-- The exhaust as its own 3D subsystem (migration 0007). A separate block: the
-- enum value only exists once 0007 has committed.
do $do$
begin
  if exists (select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
             where t.typname = 'viewer_group' and e.enumlabel = 'exhaust') then
    insert into public.parts (category_id, name, slug, viewer_group, description, "function",
                              typical_materials, location, common_failure_points,
                              performance_impact, display_order)
    select pc.id, 'Silencer (Muffler)', 'exhaust-silencer'::public.slug,
           'exhaust'::public.viewer_group,
           'The rear section of the exhaust. Chambers, baffles and perforated tubes reflect and absorb the pressure pulses in the exhaust gas so that far less of their energy leaves the tailpipe as sound.',
           'Brings exhaust noise within legal limits, shapes the character of the car''s sound, and discharges the gas away from the cabin.',
           'Stainless or aluminised steel shells; perforated tubes and baffles; mineral-wool or glass-fibre packing.',
           'At the rear of the exhaust system, usually mounted across the car ahead of the rear bumper.',
           'Internal corrosion from condensed water on short journeys; packing blow-out; failed hangers and joints.',
           'A restrictive silencer adds back-pressure and costs power. Valved systems open a straight-through path at high load to cut restriction, then close again to meet drive-by noise limits.',
           17::smallint
    from public.part_categories pc
    where pc.slug = 'engine'
    on conflict (slug) do nothing;

    update public.parts
       set viewer_group = 'exhaust'::public.viewer_group
     where slug in ('exhaust-manifold', 'catalytic-converter', 'exhaust-silencer')
       and viewer_group is distinct from 'exhaust'::public.viewer_group;

    insert into public.part_relations (part_id, related_part_id)
    select least(a.id, b.id), greatest(a.id, b.id)
    from public.parts a, public.parts b
    where a.slug = 'catalytic-converter' and b.slug = 'exhaust-silencer'
    on conflict do nothing;
  end if;
end;
$do$;

-- The eight photographs committed under public/images/cars/. Each was picked
-- by scripts/fetch-images.mjs from Wikimedia Commons and then checked by eye
-- (wrong picks are listed in scripts/image-skip.txt instead). Author and
-- licence come from public/images/CREDITS.md; the Commons file-page URL was
-- not recorded when they were downloaded, so source_url stays NULL rather
-- than being guessed — re-running fetch-images on a networked machine fills
-- it in for new picks.
--
-- A row is added only when the variant has no image at all, so this never
-- duplicates or overrides a photograph registered some other way.
do $do$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'car_media'
               and column_name = 'license') then
    insert into public.car_media (variant_id, type, url, alt, is_primary, display_order,
                                  credit, shot, source, license, author, width, height,
                                  file_size_bytes)
    select v.id, 'image', p.url, p.alt, true, 0,
           'Photo: ' || p.author || ' / Wikimedia Commons (' || p.license || ')',
           'hero'::public.media_shot, 'Wikimedia Commons', p.license, p.author,
           p.width, p.height, p.bytes
    from (values
      ('porsche', '911',     'carrera-s',               '/images/cars/porsche-911-carrera-s.jpg',              'Porsche 911 Carrera S',                  'MrWalkr',      'CC BY-SA 4.0',    1280, 665, 181166),
      ('porsche', '911',     'gt3',                     '/images/cars/porsche-911-gt3.jpg',                    'Porsche 911 GT3',                        'MrWalkr',      'CC BY-SA 4.0',    1280, 636, 238331),
      ('porsche', '911',     'turbo-s',                 '/images/cars/porsche-911-turbo-s.jpg',                'Porsche 911 Turbo S',                    'Alexander-93', 'CC BY-SA 4.0',    1280, 620, 174456),
      ('tata',    'altroz',  '1-2-petrol',              '/images/cars/tata-altroz-1-2-petrol.jpg',             'Tata Altroz 1.2 Petrol',                 'Dairokkan9',   'CC BY-SA 4.0',    1280, 720, 236705),
      ('tesla',   'model-s', 'plaid',                   '/images/cars/tesla-model-s-plaid.jpg',                'Tesla Model S Plaid',                    'Alexander-93', 'CC BY-SA 4.0',    1280, 692, 262854),
      ('toyota',  'corolla', '1-8-hybrid',              '/images/cars/toyota-corolla-1-8-hybrid.jpg',          'Toyota Corolla 1.8 Hybrid',              'Alexander-93', 'CC BY-SA 4.0',    1280, 662, 270835),
      ('volvo',   'ex30',    'twin-motor-performance',  '/images/cars/volvo-ex30-twin-motor-performance.jpg',  'Volvo EX30 Twin Motor Performance',      'Alexander-93', 'CC BY-SA 4.0',    1280, 926, 351018),
      ('volvo',   'xc90',    't8-recharge',             '/images/cars/volvo-xc90-t8-recharge.jpg',             'Volvo XC90 T8 Recharge',                 '© M 93',       'CC BY-SA 3.0 de', 1280, 706, 262837)
    ) as p (manufacturer, model, variant, url, alt, author, license, width, height, bytes)
    join public.manufacturers mf on mf.slug = p.manufacturer
    join public.car_models m on m.manufacturer_id = mf.id and m.slug = p.model
    join public.car_variants v on v.model_id = m.id and v.slug = p.variant
    where not exists (select 1 from public.car_media cm
                      where cm.variant_id = v.id and cm.type = 'image');
  end if;
end;
$do$;
