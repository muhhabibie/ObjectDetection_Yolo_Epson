--
-- PostgreSQL database dump
--

\restrict hTvoD0RJizoFoGvhB5SCSKF4sbzFcPVheh8FVupY4CEcnDBebTQLHlRBFgwTqz9

-- Dumped from database version 17.9
-- Dumped by pg_dump version 17.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    user_id uuid,
    username character varying(50),
    role character varying(20),
    action character varying(50),
    details text,
    created_at timestamp without time zone
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_logs_id_seq OWNER TO postgres;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: inspections; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inspections (
    id integer NOT NULL,
    inspection_id character varying(20) NOT NULL,
    part_name character varying(100) NOT NULL,
    batch_id character varying(100),
    expected_qty integer NOT NULL,
    detected_qty integer NOT NULL,
    discrepancy integer NOT NULL,
    is_match boolean NOT NULL,
    average_confidence double precision NOT NULL,
    image_path character varying(500),
    processing_time_sec double precision,
    created_at timestamp without time zone NOT NULL,
    image_result_path character varying(500)
);


ALTER TABLE public.inspections OWNER TO postgres;

--
-- Name: inspections_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.inspections_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inspections_id_seq OWNER TO postgres;

--
-- Name: inspections_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.inspections_id_seq OWNED BY public.inspections.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    username character varying(50),
    email character varying(255),
    password_hash text,
    role character varying(20) DEFAULT 'user'::character varying,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: inspections id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inspections ALTER COLUMN id SET DEFAULT nextval('public.inspections_id_seq'::regclass);


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_logs (id, user_id, username, role, action, details, created_at) FROM stdin;
1	2c07f027-c6a4-4ff9-999b-174f2f854c1c	vendor	vendor	LOGIN	Pengguna vendor berhasil login (Role: vendor)	2026-06-06 12:03:49.383218
2	8af50b0e-2735-4655-9751-5620964b2145	qcepson	qc_epson	LOGIN	Pengguna qcepson berhasil login (Role: qc_epson)	2026-06-06 12:07:58.436121
3	8af50b0e-2735-4655-9751-5620964b2145	qcepson	qc_epson	LOGIN	Pengguna qcepson berhasil login (Role: qc_epson)	2026-06-06 13:00:13.930731
4	8af50b0e-2735-4655-9751-5620964b2145	qcepson	qc_epson	UPDATE_SETTINGS	Mengubah parameter active-settings ke: Gear Roller (target: 12 gear)	2026-06-06 13:01:05.799492
5	2c07f027-c6a4-4ff9-999b-174f2f854c1c	vendor	vendor	LOGIN	Pengguna vendor berhasil login (Role: vendor)	2026-06-06 13:14:36.40901
6	8af50b0e-2735-4655-9751-5620964b2145	qcepson	qc_epson	LOGIN	Pengguna qcepson berhasil login (Role: qc_epson)	2026-06-06 13:14:55.540429
7	8af50b0e-2735-4655-9751-5620964b2145	qcepson	qc_epson	LOGIN	Pengguna qcepson berhasil login (Role: qc_epson)	2026-06-06 13:16:06.293853
8	8af50b0e-2735-4655-9751-5620964b2145	qcepson	qc_epson	UPDATE_SETTINGS	Mengubah parameter active-settings ke: Gear Roller (target: 12 gear)	2026-06-06 13:22:47.462275
9	8af50b0e-2735-4655-9751-5620964b2145	qcepson	qc_epson	UPDATE_SETTINGS	Mengubah parameter active-settings ke: Gear Roller (target: 12 gear)	2026-06-06 13:23:51.261083
10	8af50b0e-2735-4655-9751-5620964b2145	qcepson	qc_epson	LOGIN	Pengguna qcepson berhasil login (Role: qc_epson)	2026-06-06 14:27:05.933372
11	8af50b0e-2735-4655-9751-5620964b2145	qcepson	qc_epson	LOGIN	Pengguna qcepson berhasil login (Role: qc_epson)	2026-06-06 14:41:17.955111
12	8af50b0e-2735-4655-9751-5620964b2145	qcepson	qc_epson	LOGIN	Pengguna qcepson berhasil login (Role: qc_epson)	2026-06-06 14:48:05.286575
13	8af50b0e-2735-4655-9751-5620964b2145	qcepson	qc_epson	UPDATE_SETTINGS	Mengubah parameter active-settings ke: Gear Roller (target: 12 gear)	2026-06-06 15:00:49.517279
14	8af50b0e-2735-4655-9751-5620964b2145	qcepson	qc_epson	LOGIN	Pengguna qcepson berhasil login (Role: qc_epson)	2026-06-06 15:03:25.688973
15	8af50b0e-2735-4655-9751-5620964b2145	qcepson	qc_epson	LOGIN	Pengguna qcepson berhasil login (Role: qc_epson)	2026-06-06 15:33:52.869147
16	8af50b0e-2735-4655-9751-5620964b2145	qcepson	qc_epson	UPDATE_SETTINGS	Mengubah parameter active-settings ke: Gear Roller (target: 12 gear)	2026-06-06 15:33:55.940724
17	8af50b0e-2735-4655-9751-5620964b2145	qcepson	qc_epson	UPDATE_SETTINGS	Mengubah parameter active-settings ke: Gear Roller (target: 12 gear)	2026-06-06 15:33:56.218453
18	8af50b0e-2735-4655-9751-5620964b2145	qcepson	qc_epson	UPDATE_SETTINGS	Mengubah parameter active-settings ke: Gear Roller (target: 12 gear)	2026-06-06 15:33:58.269519
19	8af50b0e-2735-4655-9751-5620964b2145	qcepson	qc_epson	UPDATE_SETTINGS	Mengubah parameter active-settings ke: Gear Roller (target: 12 gear)	2026-06-06 15:33:58.993237
20	8af50b0e-2735-4655-9751-5620964b2145	qcepson	qc_epson	UPDATE_SETTINGS	Mengubah parameter active-settings ke: Gear Roller (target: 12 gear)	2026-06-06 15:34:00.429548
21	8af50b0e-2735-4655-9751-5620964b2145	qcepson	qc_epson	UPDATE_SETTINGS	Mengubah parameter active-settings ke: Gear Roller (target: 14 gear)	2026-06-06 15:34:00.620973
22	8af50b0e-2735-4655-9751-5620964b2145	qcepson	qc_epson	UPDATE_SETTINGS	Mengubah parameter active-settings ke: Gear Roller (target: 1 gear)	2026-06-06 15:34:00.633506
23	8af50b0e-2735-4655-9751-5620964b2145	qcepson	qc_epson	UPDATE_SETTINGS	Mengubah parameter active-settings ke: Gear Roller (target: 143 gear)	2026-06-06 15:34:01.398728
24	8af50b0e-2735-4655-9751-5620964b2145	qcepson	qc_epson	UPDATE_SETTINGS	Mengubah parameter active-settings ke: Gear Roller (target: 143 gear)	2026-06-06 15:34:01.629567
25	8af50b0e-2735-4655-9751-5620964b2145	qcepson	qc_epson	UPDATE_SETTINGS	Mengubah parameter active-settings ke: Gear Roller (target: 143 gear)	2026-06-06 15:34:02.166595
26	8af50b0e-2735-4655-9751-5620964b2145	qcepson	qc_epson	UPDATE_SETTINGS	Mengubah parameter active-settings ke: Gear Roller (target: 143 gear)	2026-06-06 15:34:02.640971
27	8af50b0e-2735-4655-9751-5620964b2145	qcepson	qc_epson	UPDATE_SETTINGS	Mengubah parameter active-settings ke: Gear Roller (target: 143 gear)	2026-06-06 15:34:06.648816
28	8af50b0e-2735-4655-9751-5620964b2145	qcepson	qc_epson	UPDATE_SETTINGS	Mengubah parameter active-settings ke: Gear Roller (target: 143 gear)	2026-06-06 15:34:07.299367
29	8af50b0e-2735-4655-9751-5620964b2145	qcepson	qc_epson	UPDATE_SETTINGS	Mengubah parameter active-settings ke: Gear Roller (target: 143 gear)	2026-06-06 15:34:07.770818
30	8af50b0e-2735-4655-9751-5620964b2145	qcepson	qc_epson	UPDATE_SETTINGS	Mengubah parameter active-settings ke: Gear Roller (target: 143 gear)	2026-06-06 15:34:08.517872
31	8af50b0e-2735-4655-9751-5620964b2145	qcepson	qc_epson	UPDATE_SETTINGS	Mengubah parameter active-settings ke: Gear Roller (target: 142 gear)	2026-06-06 15:34:08.706582
32	8af50b0e-2735-4655-9751-5620964b2145	qcepson	qc_epson	UPDATE_SETTINGS	Mengubah parameter active-settings ke: Gear Roller (target: 141 gear)	2026-06-06 15:34:08.827174
33	8af50b0e-2735-4655-9751-5620964b2145	qcepson	qc_epson	UPDATE_SETTINGS	Mengubah parameter active-settings ke: Gear Roller (target: 140 gear)	2026-06-06 15:34:09.028031
34	8af50b0e-2735-4655-9751-5620964b2145	qcepson	qc_epson	UPDATE_SETTINGS	Mengubah parameter active-settings ke: Gear Roller (target: 139 gear)	2026-06-06 15:34:09.532852
35	8af50b0e-2735-4655-9751-5620964b2145	qcepson	qc_epson	UPDATE_SETTINGS	Mengubah parameter active-settings ke: Gear Roller (target: 139 gear)	2026-06-06 15:34:09.746532
36	8af50b0e-2735-4655-9751-5620964b2145	qcepson	qc_epson	UPDATE_SETTINGS	Mengubah parameter active-settings ke: Gear Roller (target: 139 gear)	2026-06-06 15:34:11.581661
37	8af50b0e-2735-4655-9751-5620964b2145	qcepson	qc_epson	UPDATE_SETTINGS	Mengubah parameter active-settings ke: Gear Roller (target: 139 gear)	2026-06-06 15:34:12.131268
38	8af50b0e-2735-4655-9751-5620964b2145	qcepson	qc_epson	UPDATE_SETTINGS	Mengubah parameter active-settings ke: Gear Roller (target: 139 gear)	2026-06-06 15:34:13.866924
39	8af50b0e-2735-4655-9751-5620964b2145	qcepson	qc_epson	UPDATE_SETTINGS	Mengubah parameter active-settings ke: Gear Roller (target: 139 gear)	2026-06-06 15:34:20.291658
40	8af50b0e-2735-4655-9751-5620964b2145	qcepson	qc_epson	UPDATE_SETTINGS	Mengubah parameter active-settings ke: Gear Roller (target: 139 gear)	2026-06-06 15:34:20.768877
41	8af50b0e-2735-4655-9751-5620964b2145	qcepson	qc_epson	UPDATE_SETTINGS	Mengubah parameter active-settings ke: Gear Roller (target: 139 gear)	2026-06-06 15:34:21.676062
42	8af50b0e-2735-4655-9751-5620964b2145	qcepson	qc_epson	LOGIN	Pengguna qcepson berhasil login (Role: qc_epson)	2026-06-06 15:36:24.137922
43	8af50b0e-2735-4655-9751-5620964b2145	qcepson	qc_epson	UPDATE_SETTINGS	Mengubah parameter active-settings ke: Gear Roller (target: 12 gear)	2026-06-06 15:36:25.751073
44	8af50b0e-2735-4655-9751-5620964b2145	qcepson	qc_epson	UPDATE_SETTINGS	Mengubah parameter active-settings ke: Gear Roller (target: 12 gear)	2026-06-06 15:36:26.253183
45	8af50b0e-2735-4655-9751-5620964b2145	qcepson	qc_epson	CAPTURE_IMAGE	Berhasil mendeteksi 0 gear pada part Gear Roller (ID: INS-28815)	2026-06-06 15:36:46.031249
46	8af50b0e-2735-4655-9751-5620964b2145	qcepson	qc_epson	CAPTURE_IMAGE	Berhasil mendeteksi 0 gear pada part Gear Roller (ID: INS-51059)	2026-06-06 15:36:51.749916
47	8af50b0e-2735-4655-9751-5620964b2145	qcepson	qc_epson	UPDATE_SETTINGS	Mengubah parameter active-settings ke: Gear Roller (target: 12 gear)	2026-06-06 15:40:06.541429
48	8af50b0e-2735-4655-9751-5620964b2145	qcepson	qc_epson	UPDATE_SETTINGS	Mengubah parameter active-settings ke: Gear Roller (target: 12 gear)	2026-06-06 15:40:07.223048
49	8af50b0e-2735-4655-9751-5620964b2145	qcepson	qc_epson	UPDATE_SETTINGS	Mengubah parameter active-settings ke: Gear Roller (target: 12 gear)	2026-06-06 15:40:07.726595
50	8af50b0e-2735-4655-9751-5620964b2145	qcepson	qc_epson	UPDATE_SETTINGS	Mengubah parameter active-settings ke: Gear Roller (target: 12 gear)	2026-06-06 15:40:13.462818
51	8af50b0e-2735-4655-9751-5620964b2145	qcepson	qc_epson	UPDATE_SETTINGS	Mengubah parameter active-settings ke: Gear Roller (target: 12 gear)	2026-06-06 15:40:13.961023
52	8af50b0e-2735-4655-9751-5620964b2145	qcepson	qc_epson	UPDATE_SETTINGS	Mengubah parameter active-settings ke: Gear Roller (target: 12 gear)	2026-06-06 15:40:47.937732
53	8af50b0e-2735-4655-9751-5620964b2145	qcepson	qc_epson	UPDATE_SETTINGS	Mengubah parameter active-settings ke: Gear Roller (target: 12 gear)	2026-06-06 15:50:37.852373
54	8af50b0e-2735-4655-9751-5620964b2145	qcepson	qc_epson	UPDATE_SETTINGS	Mengubah parameter active-settings ke: Gear Roller (target: 12 gear)	2026-06-06 15:50:45.46999
55	8af50b0e-2735-4655-9751-5620964b2145	qcepson	qc_epson	UPDATE_SETTINGS	Mengubah parameter active-settings ke: Gear Roller (target: 12 gear)	2026-06-06 15:55:06.98785
56	8af50b0e-2735-4655-9751-5620964b2145	qcepson	qc_epson	UPDATE_SETTINGS	Mengubah parameter active-settings ke: Gear Roller (target: 12 gear)	2026-06-06 15:55:21.985152
57	8af50b0e-2735-4655-9751-5620964b2145	qcepson	qc_epson	UPDATE_SETTINGS	Mengubah parameter active-settings ke: Gear Roller (target: 12 gear)	2026-06-06 16:05:22.783494
58	8af50b0e-2735-4655-9751-5620964b2145	qcepson	qc_epson	UPDATE_SETTINGS	Mengubah parameter active-settings ke: Gear Roller (target: 12 gear)	2026-06-06 16:05:23.282111
59	8af50b0e-2735-4655-9751-5620964b2145	qcepson	qc_epson	CAPTURE_IMAGE	Berhasil mendeteksi 0 gear pada part Gear Roller (ID: INS-84130)	2026-06-06 16:05:32.537502
60	8af50b0e-2735-4655-9751-5620964b2145	qcepson	qc_epson	CAPTURE_IMAGE	Berhasil mendeteksi 0 gear pada part Gear Roller (ID: INS-72014)	2026-06-06 16:05:40.716724
61	8af50b0e-2735-4655-9751-5620964b2145	qcepson	qc_epson	CAPTURE_IMAGE	Berhasil mendeteksi 0 gear pada part Gear Roller (ID: INS-52233)	2026-06-06 16:05:49.052378
62	8af50b0e-2735-4655-9751-5620964b2145	qcepson	qc_epson	UPDATE_SETTINGS	Mengubah parameter active-settings ke: Gear Roller (target: 12 gear)	2026-06-06 16:05:57.594517
63	8af50b0e-2735-4655-9751-5620964b2145	qcepson	qc_epson	LOGIN	Pengguna qcepson berhasil login (Role: qc_epson)	2026-06-06 16:06:19.793383
64	8af50b0e-2735-4655-9751-5620964b2145	qcepson	qc_epson	UPDATE_SETTINGS	Mengubah parameter active-settings ke: Gear Roller (target: 12 gear)	2026-06-06 16:07:05.280349
65	8af50b0e-2735-4655-9751-5620964b2145	qcepson	qc_epson	UPDATE_SETTINGS	Mengubah parameter active-settings ke: Gear Roller (target: 12 gear)	2026-06-06 16:07:05.765552
66	8af50b0e-2735-4655-9751-5620964b2145	qcepson	qc_epson	UPDATE_SETTINGS	Mengubah parameter active-settings ke: Gear Roller (target: 12 gear)	2026-06-06 16:07:43.605787
67	8af50b0e-2735-4655-9751-5620964b2145	qcepson	qc_epson	UPDATE_SETTINGS	Mengubah parameter active-settings ke: Gear Roller (target: 12 gear)	2026-06-06 16:07:44.105358
68	8af50b0e-2735-4655-9751-5620964b2145	qcepson	qc_epson	UPDATE_SETTINGS	Mengubah parameter active-settings ke: Gear Roller (target: 12 gear)	2026-06-06 16:07:47.823727
69	8af50b0e-2735-4655-9751-5620964b2145	qcepson	qc_epson	LOGIN	Pengguna qcepson berhasil login (Role: qc_epson)	2026-06-06 16:10:27.099972
70	8af50b0e-2735-4655-9751-5620964b2145	qcepson	qc_epson	DELETE_INSPECTION	Menghapus riwayat inspeksi INS-52233	2026-06-06 16:11:53.298801
\.


--
-- Data for Name: inspections; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inspections (id, inspection_id, part_name, batch_id, expected_qty, detected_qty, discrepancy, is_match, average_confidence, image_path, processing_time_sec, created_at, image_result_path) FROM stdin;
18	INS-30330	Gear Roller	\N	10	10	0	t	0.9688	/static/images/raw/30658d95-d2a1-4206-8650-a2638f92529f.jpg	1.104	2026-06-06 09:25:16.106795	/static/images/result/30658d95-d2a1-4206-8650-a2638f92529f.jpg
20	INS-88102	Gear Roller	\N	20	19	-1	f	0.9127	/static/images/raw/732e59ce-9415-450d-9ea3-ec0d63fb24b2.jpg	9.708	2026-06-06 09:51:34.992182	/static/images/result/732e59ce-9415-450d-9ea3-ec0d63fb24b2.jpg
25	INS-76784	Gear Roller	\N	20	21	1	f	0.8777	/static/images/raw/4ad50e35-aef7-439e-95a5-584935f4bba1.jpg	7.673	2026-06-06 10:11:07.516521	/static/images/result/4ad50e35-aef7-439e-95a5-584935f4bba1.jpg
31	INS-66305	Gear Roller	\N	10	10	0	t	0.9442	/static/images/raw/4675df2b-dd7a-40df-962c-8cb5bd6ab4bf.jpg	5.17	2026-06-06 11:21:46.617701	/static/images/result/4675df2b-dd7a-40df-962c-8cb5bd6ab4bf.jpg
33	INS-20094	Gear Roller	\N	15	15	0	t	0.9196	/static/images/raw/ac4b6152-956e-4539-a486-23c55ac40bf4.jpg	3.955	2026-06-06 11:24:13.754259	/static/images/result/ac4b6152-956e-4539-a486-23c55ac40bf4.jpg
38	INS-74801	Gear Roller	\N	27	27	0	t	0.9411	/static/images/raw/9bc12e05-a238-48ec-adc3-a85eb001674f.jpg	3.257	2026-06-06 11:28:41.907816	/static/images/result/9bc12e05-a238-48ec-adc3-a85eb001674f.jpg
39	INS-28815	Gear Roller	\N	12	0	-12	f	0	/static/images/raw/aa35b235-bdd6-4486-b383-5a21660612bb.jpg	1.416	2026-06-06 15:36:46.01935	/static/images/result/aa35b235-bdd6-4486-b383-5a21660612bb.jpg
40	INS-51059	Gear Roller	\N	12	0	-12	f	0	/static/images/raw/5a6709f8-f6e7-432c-8611-fd973b6f8edb.jpg	0.591	2026-06-06 15:36:51.741519	/static/images/result/5a6709f8-f6e7-432c-8611-fd973b6f8edb.jpg
41	INS-84130	Gear Roller	\N	12	0	-12	f	0	/static/images/raw/28ddae01-93d8-4016-953d-cfd40c622d1a.jpg	0.416	2026-06-06 16:05:32.533424	/static/images/result/28ddae01-93d8-4016-953d-cfd40c622d1a.jpg
42	INS-72014	Gear Roller	\N	12	0	-12	f	0	/static/images/raw/f4733a58-bb29-49cf-b8e8-648d56f4926b.jpg	0.357	2026-06-06 16:05:40.711422	/static/images/result/f4733a58-bb29-49cf-b8e8-648d56f4926b.jpg
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, username, email, password_hash, role, created_at) FROM stdin;
3f215578-faee-4768-99bb-6877f75763a1	admin	admin@epson.com	$2b$12$ZR6Utg/iwMLDJX.KEpC7behkfFuKlLCxCzj683mW7wCpmrTe4xfHG	admin	2026-06-05 18:40:04.665155
8af50b0e-2735-4655-9751-5620964b2145	qcepson	qcepson@epson.com	$2b$12$ipClyajJGuz0ErEoS.a3fubjX97eZBINxLsNfufCOPS2/v6AsuA8e	qc_epson	2026-06-06 12:02:05.046816
a41c70a9-549d-4106-824b-f03947a4e7da	storageepson	storageepson@epson.com	$2b$12$g43YzYKZhZ0gssAjQQ5AZOEUj/qimMqnu4.rRpL7WOPexY9DJC3IS	storage_epson	2026-06-06 12:02:05.988068
2c07f027-c6a4-4ff9-999b-174f2f854c1c	vendor	vendor@epson.com	$2b$12$MXtvfVWo/UwS7AyPaOSgOeyzNCqcTfAjBDP1tK0/6NtScMtRBhc0W	vendor	2026-06-06 12:02:07.166541
\.


--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 70, true);


--
-- Name: inspections_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.inspections_id_seq', 43, true);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: inspections inspections_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inspections
    ADD CONSTRAINT inspections_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: ix_audit_logs_action; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_audit_logs_action ON public.audit_logs USING btree (action);


--
-- Name: ix_audit_logs_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_audit_logs_id ON public.audit_logs USING btree (id);


--
-- Name: ix_inspections_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_inspections_id ON public.inspections USING btree (id);


--
-- Name: ix_inspections_inspection_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ix_inspections_inspection_id ON public.inspections USING btree (inspection_id);


--
-- Name: ix_inspections_part_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_inspections_part_name ON public.inspections USING btree (part_name);


--
-- PostgreSQL database dump complete
--

\unrestrict hTvoD0RJizoFoGvhB5SCSKF4sbzFcPVheh8FVupY4CEcnDBebTQLHlRBFgwTqz9

