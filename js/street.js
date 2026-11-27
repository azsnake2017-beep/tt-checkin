// js/street.js — Вкладка "Улица" в Радаре: карта в стиле GTA, выпадающий фильтр районов, 113 точек Челябинска

(function() {
  var DEFAULT_STREET_SPOTS = [{"id": "street_70030076975354402", "name": "проспект Победы", "district": "Калининский", "lat": 55.186104, "lng": 61.438791, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030076975354402"}, {"id": "street_70030076975354407", "name": "улица Героев Танкограда, 40А", "district": "Калининский", "lat": 55.186489, "lng": 61.440128, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030076975354407"}, {"id": "street_70030076975354425", "name": "улица 5-го Декабря, 27", "district": "Калининский", "lat": 55.184164, "lng": 61.434646, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030076975354425"}, {"id": "street_70030077123730606", "name": "проспект Победы, 129", "district": "Калининский", "lat": 55.185055, "lng": 61.423474, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077123730606"}, {"id": "street_70030077122840060", "name": "улица Лермонтова, 4", "district": "Тракторозаводский", "lat": 55.183317, "lng": 61.443298, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077122840060"}, {"id": "street_70030077182935584", "name": "3-я Арзамасская улица, 27", "district": "Тракторозаводский", "lat": 55.183997, "lng": 61.4498, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077182935584"}, {"id": "street_70030077012543226", "name": "улица Бажова", "district": "Тракторозаводский", "lat": 55.182837, "lng": 61.446613, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077012543226"}, {"id": "street_70030077012543225", "name": "улица Бажова", "district": "Тракторозаводский", "lat": 55.182569, "lng": 61.446889, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077012543225"}, {"id": "street_70030077124307990", "name": "улица Бажова, 76А", "district": "Тракторозаводский", "lat": 55.180347, "lng": 61.439438, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077124307990"}, {"id": "street_70030077109966668", "name": "улица Бажова, 97А", "district": "Тракторозаводский", "lat": 55.18123, "lng": 61.451636, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077109966668"}, {"id": "street_70030076990884001", "name": "улица Горького", "district": "Тракторозаводский", "lat": 55.178711, "lng": 61.435874, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030076990884001"}, {"id": "street_70030077109502050", "name": "пос. Первоозёрный", "district": "Тракторозаводский", "lat": 55.197763, "lng": 61.475055, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077109502050"}, {"id": "street_70030077007081154", "name": "улица Карпенко, 11", "district": "Тракторозаводский", "lat": 55.178133, "lng": 61.443425, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077007081154"}, {"id": "street_70030077183794085", "name": "1-й переулок Лермонтова", "district": "Тракторозаводский", "lat": 55.18071, "lng": 61.456587, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077183794085"}, {"id": "street_70030077007081150", "name": "улица Котина, 46", "district": "Тракторозаводский", "lat": 55.177428, "lng": 61.442102, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077007081150"}, {"id": "street_70030077125174089", "name": "улица Котина", "district": "Тракторозаводский", "lat": 55.178107, "lng": 61.454441, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077125174089"}, {"id": "street_70030077200179721", "name": "улица Лермонтова", "district": "Тракторозаводский", "lat": 55.177112, "lng": 61.423856, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077200179721"}, {"id": "street_70030077011352690", "name": "Артиллерийская улица, 71", "district": "Тракторозаводский", "lat": 55.175331, "lng": 61.431658, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077011352690"}, {"id": "street_70030076950206676", "name": "Октябрьская улица, 7", "district": "Тракторозаводский", "lat": 55.180766, "lng": 61.465086, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030076950206676"}, {"id": "street_70030077182028058", "name": "Передовой переулок", "district": "Тракторозаводский", "lat": 55.174767, "lng": 61.448812, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077182028058"}, {"id": "street_70030076249991410", "name": "Тракторозаводский", "district": "Тракторозаводский", "lat": 55.178304, "lng": 61.463356, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030076249991410"}, {"id": "street_70030076656056200", "name": "Сквер ДС Юность", "district": "Центральный", "lat": 55.168174, "lng": 61.390621, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030076656056200"}, {"id": "street_70030076783179445", "name": "Центральный", "district": "Центральный", "lat": 55.1589, "lng": 61.380174, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030076783179445"}, {"id": "street_70030076939692649", "name": "Центральный", "district": "Центральный", "lat": 55.162002, "lng": 61.384691, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030076939692649"}, {"id": "street_70030076957381359", "name": "Центральный", "district": "Центральный", "lat": 55.161928, "lng": 61.384702, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030076957381359"}, {"id": "street_70030076962969631", "name": "ЖК Манхэттен", "district": "Центральный", "lat": 55.172604, "lng": 61.360477, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030076962969631"}, {"id": "street_70030076963493379", "name": "Центральный", "district": "Центральный", "lat": 55.152141, "lng": 61.381698, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030076963493379"}, {"id": "street_70030077037578044", "name": "Центральный", "district": "Центральный", "lat": 55.164242, "lng": 61.409626, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077037578044"}, {"id": "street_70030077066682756", "name": "Центральный", "district": "Центральный", "lat": 55.146148, "lng": 61.375385, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077066682756"}, {"id": "street_70030077072646963", "name": "ЖК Лесопарковый", "district": "Центральный", "lat": 55.156138, "lng": 61.367853, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077072646963"}, {"id": "street_70030077074583172", "name": "Центральный", "district": "Центральный", "lat": 55.151087, "lng": 61.37944, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077074583172"}, {"id": "street_70030077078521299", "name": "Центральный", "district": "Центральный", "lat": 55.141986, "lng": 61.375135, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077078521299"}, {"id": "street_70030077111742964", "name": "Заручейный квартал", "district": "Центральный", "lat": 55.169864, "lng": 61.422851, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077111742964"}, {"id": "street_70030077122204316", "name": "Центральный", "district": "Центральный", "lat": 55.172362, "lng": 61.373056, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077122204316"}, {"id": "street_70030077130584018", "name": "Заручейный квартал", "district": "Центральный", "lat": 55.172012, "lng": 61.418425, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077130584018"}, {"id": "street_70030077135035481", "name": "Центральный", "district": "Центральный", "lat": 55.153217, "lng": 61.38861, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077135035481"}, {"id": "street_70030077135479917", "name": "Центральный", "district": "Центральный", "lat": 55.150587, "lng": 61.377473, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077135479917"}, {"id": "street_70030077142834369", "name": "Центральный", "district": "Центральный", "lat": 55.157448, "lng": 61.390393, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077142834369"}, {"id": "street_70030077152805769", "name": "ЖК Западный луч", "district": "Центральный", "lat": 55.170438, "lng": 61.377311, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077152805769"}, {"id": "street_70030077192048373", "name": "Центральный", "district": "Центральный", "lat": 55.145941, "lng": 61.372479, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077192048373"}, {"id": "street_70030077193287178", "name": "ЦПКиО им. Гагарина", "district": "Центральный", "lat": 55.164367, "lng": 61.367047, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077193287178"}, {"id": "street_70030076875880401", "name": "Курчатовский", "district": "Курчатовский", "lat": 55.184874, "lng": 61.389928, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030076875880401"}, {"id": "street_70030076972647611", "name": "Курчатовский", "district": "Курчатовский", "lat": 55.190224, "lng": 61.370584, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030076972647611"}, {"id": "street_70030076979931638", "name": "Курчатовский", "district": "Курчатовский", "lat": 55.185327, "lng": 61.370403, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030076979931638"}, {"id": "street_70030077006737577", "name": "Курчатовский", "district": "Курчатовский", "lat": 55.184602, "lng": 61.392862, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077006737577"}, {"id": "street_70030077008069768", "name": "Курчатовский", "district": "Курчатовский", "lat": 55.188569, "lng": 61.391036, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077008069768"}, {"id": "street_70030077008069769", "name": "Курчатовский", "district": "Курчатовский", "lat": 55.191003, "lng": 61.390298, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077008069769"}, {"id": "street_70030077087444423", "name": "Курчатовский", "district": "Курчатовский", "lat": 55.190816, "lng": 61.364842, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077087444423"}, {"id": "street_70030077140557317", "name": "Курчатовский", "district": "Курчатовский", "lat": 55.190525, "lng": 61.382486, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077140557317"}, {"id": "street_70030077140557326", "name": "Курчатовский", "district": "Курчатовский", "lat": 55.191246, "lng": 61.382786, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077140557326"}, {"id": "street_70030077140557335", "name": "Курчатовский", "district": "Курчатовский", "lat": 55.189375, "lng": 61.382591, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077140557335"}, {"id": "street_70030077140557382", "name": "Курчатовский", "district": "Курчатовский", "lat": 55.188637, "lng": 61.384073, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077140557382"}, {"id": "street_70030077142029980", "name": "Курчатовский", "district": "Курчатовский", "lat": 55.186144, "lng": 61.380893, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077142029980"}, {"id": "street_70030077142029999", "name": "Курчатовский", "district": "Курчатовский", "lat": 55.190135, "lng": 61.377735, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077142029999"}, {"id": "street_70030077142495091", "name": "Курчатовский", "district": "Курчатовский", "lat": 55.189973, "lng": 61.367348, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077142495091"}, {"id": "street_70030077182931476", "name": "Курчатовский", "district": "Курчатовский", "lat": 55.184532, "lng": 61.380784, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077182931476"}, {"id": "street_70030077182931485", "name": "Курчатовский", "district": "Курчатовский", "lat": 55.185121, "lng": 61.381587, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077182931485"}, {"id": "street_70030077199861184", "name": "Курчатовский", "district": "Курчатовский", "lat": 55.186701, "lng": 61.378429, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077199861184"}, {"id": "street_70030077199861230", "name": "Курчатовский", "district": "Курчатовский", "lat": 55.187232, "lng": 61.380552, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077199861230"}, {"id": "street_70030077179526287", "name": "Курчатовский", "district": "Курчатовский", "lat": 55.190711, "lng": 61.353748, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077179526287"}, {"id": "street_70030077148974008", "name": "Курчатовский", "district": "Курчатовский", "lat": 55.193801, "lng": 61.360995, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077148974008"}, {"id": "street_70030077179526256", "name": "Курчатовский", "district": "Курчатовский", "lat": 55.189944, "lng": 61.350687, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077179526256"}, {"id": "street_70030076319916564", "name": "Ленинский", "district": "Ленинский", "lat": 55.147591, "lng": 61.438652, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030076319916564"}, {"id": "street_70030076747125742", "name": "Ленинский", "district": "Ленинский", "lat": 55.140622, "lng": 61.452058, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030076747125742"}, {"id": "street_70030076940376232", "name": "Ленинский", "district": "Ленинский", "lat": 55.13595, "lng": 61.428844, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030076940376232"}, {"id": "street_70030076940462487", "name": "Ленинский", "district": "Ленинский", "lat": 55.146364, "lng": 61.443922, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030076940462487"}, {"id": "street_70030076940571898", "name": "Ленинский", "district": "Ленинский", "lat": 55.144605, "lng": 61.439723, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030076940571898"}, {"id": "street_70030076981228724", "name": "Ленинский", "district": "Ленинский", "lat": 55.133894, "lng": 61.430444, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030076981228724"}, {"id": "street_70030076981228725", "name": "Ленинский", "district": "Ленинский", "lat": 55.134136, "lng": 61.430945, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030076981228725"}, {"id": "street_70030076991046358", "name": "Ленинский", "district": "Ленинский", "lat": 55.141669, "lng": 61.450271, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030076991046358"}, {"id": "street_70030076991046364", "name": "Ленинский", "district": "Ленинский", "lat": 55.142807, "lng": 61.44858, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030076991046364"}, {"id": "street_70030076998766805", "name": "Ленинский", "district": "Ленинский", "lat": 55.136337, "lng": 61.448145, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030076998766805"}, {"id": "street_70030076998766810", "name": "Ленинский", "district": "Ленинский", "lat": 55.129932, "lng": 61.453493, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030076998766810"}, {"id": "street_70030076998766813", "name": "Ленинский", "district": "Ленинский", "lat": 55.129301, "lng": 61.453548, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030076998766813"}, {"id": "street_70030077003129605", "name": "Ленинский", "district": "Ленинский", "lat": 55.134888, "lng": 61.433777, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077003129605"}, {"id": "street_70030077004814128", "name": "Ленинский", "district": "Ленинский", "lat": 55.124577, "lng": 61.424354, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077004814128"}, {"id": "street_70030077006552433", "name": "пос. Первый Плановый", "district": "Ленинский", "lat": 55.123436, "lng": 61.425219, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077006552433"}, {"id": "street_70030077006552436", "name": "Ленинский", "district": "Ленинский", "lat": 55.125197, "lng": 61.430784, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077006552436"}, {"id": "street_70030077069080806", "name": "Ленинский", "district": "Ленинский", "lat": 55.137152, "lng": 61.45261, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077069080806"}, {"id": "street_70030077086233001", "name": "Ленинский", "district": "Ленинский", "lat": 55.137006, "lng": 61.435082, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077086233001"}, {"id": "street_70030077086233021", "name": "Ленинский", "district": "Ленинский", "lat": 55.138188, "lng": 61.441911, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077086233021"}, {"id": "street_70030077086233028", "name": "Ленинский", "district": "Ленинский", "lat": 55.13938, "lng": 61.442718, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077086233028"}, {"id": "street_70030077086540974", "name": "Ленинский", "district": "Ленинский", "lat": 55.144532, "lng": 61.437583, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077086540974"}, {"id": "street_70030076941886349", "name": "Советский", "district": "Советский", "lat": 55.146504, "lng": 61.415422, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030076941886349"}, {"id": "street_70030076941886352", "name": "Советский", "district": "Советский", "lat": 55.144576, "lng": 61.414416, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030076941886352"}, {"id": "street_70030076985101225", "name": "Советский", "district": "Советский", "lat": 55.156858, "lng": 61.399612, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030076985101225"}, {"id": "street_70030076994847788", "name": "Советский", "district": "Советский", "lat": 55.144669, "lng": 61.384345, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030076994847788"}, {"id": "street_70030077017376326", "name": "Советский", "district": "Советский", "lat": 55.152897, "lng": 61.417823, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077017376326"}, {"id": "street_70030077019372945", "name": "Советский", "district": "Советский", "lat": 55.149839, "lng": 61.392479, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077019372945"}, {"id": "street_70030077019758873", "name": "Советский", "district": "Советский", "lat": 55.150171, "lng": 61.397743, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077019758873"}, {"id": "street_70030077019758876", "name": "Советский", "district": "Советский", "lat": 55.14782, "lng": 61.397334, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077019758876"}, {"id": "street_70030077065662735", "name": "пос. Мебельный", "district": "Советский", "lat": 55.1255, "lng": 61.367488, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077065662735"}, {"id": "street_70030077071419348", "name": "Советский", "district": "Советский", "lat": 55.142339, "lng": 61.380989, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077071419348"}, {"id": "street_70030077113129583", "name": "Советский", "district": "Советский", "lat": 55.148772, "lng": 61.39049, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077113129583"}, {"id": "street_70030077113767632", "name": "Советский", "district": "Советский", "lat": 55.145641, "lng": 61.396127, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077113767632"}, {"id": "street_70030077118825867", "name": "пос. Некрасова", "district": "Советский", "lat": 55.136663, "lng": 61.399808, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077118825867"}, {"id": "street_70030077128531767", "name": "Советский", "district": "Советский", "lat": 55.140211, "lng": 61.404111, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077128531767"}, {"id": "street_70030077129216732", "name": "пос. Мебельный", "district": "Советский", "lat": 55.122856, "lng": 61.366647, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077129216732"}, {"id": "street_70030077135977777", "name": "ЖК EVO park", "district": "Советский", "lat": 55.147217, "lng": 61.40503, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077135977777"}, {"id": "street_70030077140684342", "name": "Советский", "district": "Советский", "lat": 55.151444, "lng": 61.394579, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077140684342"}, {"id": "street_70030077175742456", "name": "Советский", "district": "Советский", "lat": 55.160273, "lng": 61.420821, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077175742456"}, {"id": "street_70030077168293270", "name": "Металлургический", "district": "Металлургический", "lat": 55.233638, "lng": 61.384787, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077168293270"}, {"id": "street_70030077201601686", "name": "Металлургический", "district": "Металлургический", "lat": 55.234382, "lng": 61.385207, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077201601686"}, {"id": "street_70030077096599113", "name": "Металлургический", "district": "Металлургический", "lat": 55.235259, "lng": 61.38353, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077096599113"}, {"id": "street_70030076949284079", "name": "Металлургический", "district": "Металлургический", "lat": 55.235772, "lng": 61.380916, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030076949284079"}, {"id": "street_70030077201601667", "name": "Металлургический", "district": "Металлургический", "lat": 55.23626, "lng": 61.380488, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077201601667"}, {"id": "street_70030076952247959", "name": "Металлургический", "district": "Металлургический", "lat": 55.236742, "lng": 61.384361, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030076952247959"}, {"id": "street_70030076952247962", "name": "Металлургический", "district": "Металлургический", "lat": 55.23682, "lng": 61.384439, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030076952247962"}, {"id": "street_70030076952786938", "name": "Металлургический", "district": "Металлургический", "lat": 55.237558, "lng": 61.37565, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030076952786938"}, {"id": "street_70030076952247970", "name": "Металлургический", "district": "Металлургический", "lat": 55.238214, "lng": 61.381985, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030076952247970"}, {"id": "street_70030077148715171", "name": "Металлургический", "district": "Металлургический", "lat": 55.23734, "lng": 61.372055, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077148715171"}, {"id": "street_70030077147390586", "name": "Металлургический", "district": "Металлургический", "lat": 55.238247, "lng": 61.37717, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030077147390586"}, {"id": "street_70030076953837281", "name": "Металлургический", "district": "Металлургический", "lat": 55.23764, "lng": 61.370096, "gisUrl": "https://2gis.ru/chelyabinsk/geo/70030076953837281"}];

  var customStreetSpots = [];
  var streetPresenceMap = {};
  var activeDistrict = 'Все';
  var streetMap = null;
  var streetMarkersLayer = null;
  var streetMarkersById = {};
  var currentRadarMode = 'clubs';

  function getMergedSpots() {
    var byId = {};
    var list = [];
    DEFAULT_STREET_SPOTS.forEach(function(s) {
      byId[s.id] = s;
      list.push(s);
    });
    customStreetSpots.forEach(function(s) {
      if (!s || !s.id) return;
      if (byId[s.id]) {
        var idx = list.indexOf(byId[s.id]);
        if (idx !== -1) list[idx] = s;
      } else {
        list.push(s);
      }
      byId[s.id] = s;
    });
    return list;
  }

  function streetSortKey(name) {
    if (!name) return '';
    return String(name)
      .replace(/^\s*(улица|ул\.?|проспект|пр-т|пр\.?|переулок|пер\.?|бульвар|бул\.?|шоссе|набережная|наб\.?|площадь|пл\.?)\s+/i, '')
      .trim()
      .toLowerCase();
  }

  window.getStreetSpotById = function(id) {
    if (!id) return null;
    var all = getMergedSpots();
    for (var i = 0; i < all.length; i++) {
      if (all[i].id === id) return all[i];
    }
    return null;
  };

  window.getRadarLocTitle = function(loc) {
    if (typeof LOCATION_NAMES !== 'undefined' && LOCATION_NAMES[loc]) return LOCATION_NAMES[loc];
    if (typeof LOCATIONS !== 'undefined' && LOCATIONS[loc]) return LOCATIONS[loc].name;
    var spot = window.getStreetSpotById(loc);
    return spot ? spot.name : loc;
  };

  window.switchRadarMode = function(mode) {
    currentRadarMode = mode === 'street' ? 'street' : 'clubs';
    var btnClubs = document.getElementById('radar-tab-btn-clubs');
    var btnStreet = document.getElementById('radar-tab-btn-street');
    var clubsEl = document.getElementById('radar-clubs-content');
    var streetEl = document.getElementById('radar-street-content');

    if (btnClubs) btnClubs.classList.toggle('active', currentRadarMode === 'clubs');
    if (btnStreet) btnStreet.classList.toggle('active', currentRadarMode === 'street');
    if (clubsEl) clubsEl.style.display = currentRadarMode === 'clubs' ? 'flex' : 'none';
    if (streetEl) streetEl.style.display = currentRadarMode === 'street' ? 'flex' : 'none';

    if (typeof vibrate === 'function') vibrate('light');
    if (currentRadarMode === 'street') {
      initStreetMap();
      renderStreetSection();
      setTimeout(function() {
        if (streetMap) streetMap.invalidateSize();
      }, 120);
    }
  };

  function initStreetMap() {
    var mapEl = document.getElementById('street-map');
    if (!mapEl || streetMap || typeof L === 'undefined') return;
    streetMap = L.map(mapEl, {
      center: [55.1644, 61.4368],
      zoom: 12,
      zoomControl: true,
      attributionControl: false
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(streetMap);
    streetMarkersLayer = L.layerGroup().addTo(streetMap);
  }

  function renderStreetMapMarkers(spots) {
    if (!streetMap || !streetMarkersLayer || typeof L === 'undefined') return;
    streetMarkersLayer.clearLayers();
    streetMarkersById = {};

    spots.forEach(function(spot) {
      if (!spot.lat || !spot.lng) return;
      var st = streetPresenceMap[spot.id] || { players: [], plans: [] };
      var count = (st.players || []).length;
      var plansCount = (st.plans || []).length;
      var isBusy = count > 0 || plansCount > 0;

      var marker = L.circleMarker([spot.lat, spot.lng], {
        radius: isBusy ? 9 : 6,
        color: isBusy ? '#ffffff' : '#064e3b',
        weight: isBusy ? 2.5 : 1.5,
        fillColor: count > 0 ? '#10b981' : (plansCount > 0 ? '#f59e0b' : '#34d399'),
        fillOpacity: 0.95
      });

      var popupHtml =
        '<div style="min-width:170px; font-family:Inter,sans-serif;">' +
          '<div style="font-weight:800; font-size:13px; margin-bottom:4px; color:#f8fafc;">' + cleanHtml(spot.name) + '</div>' +
          '<div style="font-size:11px; color:#94a3b8; margin-bottom:8px;">Сейчас: <b style="color:#10b981;">' + count + '</b></div>' +
          '<div style="display:flex; gap:6px;">' +
            '<button onclick="focusStreetCard(\'' + escapeJS(spot.id) + '\')" style="flex:1; padding:6px 8px; border:none; border-radius:6px; background:#10b981; color:#0b1120; font-weight:800; font-size:11px; cursor:pointer;">Выбрать</button>' +
            (spot.gisUrl ? '<a href="' + cleanHtml(spot.gisUrl) + '" target="_blank" rel="noopener" style="padding:6px 8px; border-radius:6px; background:#1e293b; color:#f8fafc; border:1px solid #334155; font-weight:700; font-size:11px; text-decoration:none;">Маршрут</a>' : '') +
          '</div>' +
        '</div>';

      marker.bindPopup(popupHtml);
      marker.addTo(streetMarkersLayer);
      streetMarkersById[spot.id] = marker;
    });
  }

  window.focusStreetMapSpot = function(spotId) {
    var spot = window.getStreetSpotById(spotId);
    if (!spot) return;
    initStreetMap();
    if (streetMap && spot.lat && spot.lng) {
      streetMap.setView([spot.lat, spot.lng], 16, { animate: true });
      var m = streetMarkersById[spotId];
      if (m) m.openPopup();
      var mapEl = document.getElementById('street-map');
      if (mapEl) mapEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  window.focusStreetCard = function(spotId) {
    var card = document.getElementById('street-card-' + spotId);
    if (!card) return;
    card.classList.add('expanded');
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  window.setStreetDistrictFilter = function(district) {
    activeDistrict = district || 'Все';
    if (typeof vibrate === 'function') vibrate('light');
    renderStreetSection();
    if (streetMap && streetMarkersLayer) {
      var latlngs = [];
      streetMarkersLayer.eachLayer(function(l) {
        if (l.getLatLng) latlngs.push(l.getLatLng());
      });
      if (latlngs.length > 1) {
        streetMap.fitBounds(L.latLngBounds(latlngs), { padding: [20, 20], maxZoom: 15 });
      } else if (latlngs.length === 1) {
        streetMap.setView(latlngs[0], 15);
      }
    }
  };

  window.toggleStreetCard = function(spotId) {
    var card = document.getElementById('street-card-' + spotId);
    if (card) card.classList.toggle('expanded');
    if (typeof vibrate === 'function') vibrate('light');
  };

  function renderStreetSection() {
    var allSpots = getMergedSpots();
    var districts = [];
    allSpots.forEach(function(s) {
      if (s.district && districts.indexOf(s.district) === -1) districts.push(s.district);
    });
    districts.sort(function(a, b) { return a.localeCompare(b, 'ru'); });

    var selectEl = document.getElementById('street-district-select');
    if (selectEl) {
      var optsHtml = '<option value="Все">Все районы (' + allSpots.length + ')</option>';
      districts.forEach(function(d) {
        var cnt = allSpots.filter(function(s) { return s.district === d; }).length;
        optsHtml += '<option value="' + cleanHtml(d) + '">' + cleanHtml(d) + ' (' + cnt + ')</option>';
      });
      selectEl.innerHTML = optsHtml;
      selectEl.value = activeDistrict;
    }

    var filtered = activeDistrict === 'Все'
      ? allSpots.slice()
      : allSpots.filter(function(s) { return s.district === activeDistrict; });

    // Сортировка по улицам в алфавитном порядке (и натуральная по номерам домов)
    filtered.sort(function(a, b) {
      var ka = streetSortKey(a.name);
      var kb = streetSortKey(b.name);
      return ka.localeCompare(kb, 'ru', { numeric: true });
    });

    renderStreetMapMarkers(filtered);

    var countEl = document.getElementById('street-spots-count');
    if (countEl) countEl.innerText = filtered.length;

    var listEl = document.getElementById('street-spots-list');
    if (!listEl) return;

    var myUid = typeof getVerifiedUserId === 'function' ? getVerifiedUserId() : null;
    var html = '';

    filtered.forEach(function(spot) {
      var prevCard = document.getElementById('street-card-' + spot.id);
      var wasExpanded = prevCard && prevCard.classList.contains('expanded');
      var st = streetPresenceMap[spot.id] || { players: [], plans: [] };
      var players = st.players || [];
      var plans = st.plans || [];
      var count = players.length;

      var amIHere = false;
      var playersHtml = '';
      if (count === 0) {
        playersHtml = '<span class="empty-note">Пока свободно</span>';
      } else {
        players.forEach(function(p) {
          var pUid = p.uid || '';
          if (myUid && pUid === myUid) amIHere = true;
          var tStr = typeof formatDuration === 'function' ? formatDuration(p.time) : '';
          playersHtml += '<div class="player-row"><span class="clickable-name" onclick="showUserInfoModal(\'' + escapeJS(pUid) + '\')">' + cleanHtml(p.name || 'Игрок') + '</span><span style="font-size:11px; color:var(--text-muted);">' + tStr + '</span></div>';
        });
      }

      var amIPlanning = false;
      var plansHtml = '';
      if (plans.length === 0) {
        plansHtml = '<span class="empty-note">Никто не планировал</span>';
      } else {
        plans.forEach(function(pl) {
          var plUid = pl.uid || '';
          if (myUid && plUid === myUid) amIPlanning = true;
          var untilStr = typeof formatUntil === 'function' ? formatUntil(pl.planTime) : '';
          plansHtml += '<div class="player-row"><span class="clickable-name" onclick="showUserInfoModal(\'' + escapeJS(plUid) + '\')">' + cleanHtml(pl.name || 'Игрок') + '</span><span style="font-size:11px; color:var(--accent-amber);">' + untilStr + '</span></div>';
        });
      }

      var joinBtn = amIHere
        ? '<button class="btn btn-leave" onclick="streetLeave(\'' + escapeJS(spot.id) + '\')">Освободить</button>'
        : '<button class="btn btn-join" onclick="streetCheckIn(\'' + escapeJS(spot.id) + '\')">Я уже здесь</button>';

      var planBtn = amIPlanning
        ? '<button class="btn btn-leave" onclick="cancelPlan(\'' + escapeJS(spot.id) + '\')">Отменить план</button>'
        : '<button class="btn btn-plan" onclick="handlePlanClick(\'' + escapeJS(spot.id) + '\')">Буду позже...</button>';

      var badgeCls = count > 0 ? 'counter active' : 'counter';
      var suf = typeof getPlayersCountSuffix === 'function' ? getPlayersCountSuffix(count) : 'игроков';

      html +=
        '<div class="card street-spot-card' + (wasExpanded ? ' expanded' : '') + '" id="street-card-' + cleanHtml(spot.id) + '">' +
          '<div class="card-top" onclick="toggleStreetCard(\'' + escapeJS(spot.id) + '\')">' +
            '<div style="min-width:0; flex:1;">' +
              '<div class="card-title" style="font-size:14px;">' + cleanHtml(spot.name) + '</div>' +
            '</div>' +
            '<span class="' + badgeCls + '">' + count + ' ' + suf + '</span>' +
          '</div>' +
          '<div class="street-quick-links">' +
            '<button class="btn-plan street-mini-btn" onclick="focusStreetMapSpot(\'' + escapeJS(spot.id) + '\')">На карте</button>' +
            (spot.gisUrl ? '<a class="btn-plan street-mini-btn" href="' + cleanHtml(spot.gisUrl) + '" target="_blank" rel="noopener">Маршрут</a>' : '') +
            '<button class="btn-plan street-mini-btn" onclick="inviteToStreetSpot(\'' + escapeJS(spot.id) + '\')">Позвать играть</button>' +
          '</div>' +
          '<div class="card-collapse-wrapper">' +
            '<div class="card-body-collapse">' +
              '<div class="card-body-inner">' +
                '<div class="section-label">Сейчас играют:</div>' +
                '<div class="player-list">' + playersHtml + '</div>' +
                '<div class="section-label">Собираются прийти:</div>' +
                '<div class="player-list">' + plansHtml + '</div>' +
                '<div class="action-group">' + joinBtn + planBtn + '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>';
    });

    listEl.innerHTML = html || '<span class="empty-note">В этом районе пока нет адресов</span>';
  }

  window.streetCheckIn = function(spotId) {
    var uid = typeof getVerifiedUserId === 'function' ? getVerifiedUserId() : null;
    if (!uid || typeof currentUserProfile === 'undefined' || !currentUserProfile) {
      if (typeof customAlert === 'function') customAlert('Сначала авторизуйтесь в клубе!');
      return;
    }
    if (window.isTableActionRunning) return;
    window.isTableActionRunning = true;

    var spot = window.getStreetSpotById(spotId);
    var now = Date.now();

    db.runTransaction(function(t) {
      return t.get(db.collection('locations').doc(spotId)).then(function(doc) {
        var tP = doc.exists ? (doc.data().players || []) : [];
        var tPl = doc.exists ? (doc.data().plans || []) : [];
        var fFn = function(p) { return (p.uid || p) !== uid; };
        tP = tP.filter(fFn);
        tPl = tPl.filter(fFn);
        tP.unshift({
          name: currentUserProfile.name || 'Игрок',
          time: now,
          uid: uid,
          avatarSvg: currentUserProfile.avatarSvg || '',
          maxLimitMs: (typeof DEFAULT_LIMIT_MS !== 'undefined' ? DEFAULT_LIMIT_MS : 7200000)
        });
        t.set(db.collection('locations').doc(spotId), { players: tP, plans: tPl }, { merge: true });
      });
    }).then(function() {
      if (typeof vibrate === 'function') vibrate('medium');
      if (typeof canSendTgAlert === 'function' && canSendTgAlert('status_checkin_' + spotId + '_' + uid)) {
        var label = spot ? spot.name : spotId;
        var linkLine = (spot && spot.gisUrl) ? ('\n📍 Карта: ' + spot.gisUrl) : '';
        if (typeof sendTelegramAlert === 'function') {
          sendTelegramAlert('🏓 игрок <b>' + cleanHtml(currentUserProfile.name || 'Игрок') + '</b> уже на точке <b>' + cleanHtml(label) + '</b>!' + linkLine + '\n\nКто составит компанию?');
        }
      }
      window.isTableActionRunning = false;
    }).catch(function() {
      window.isTableActionRunning = false;
    });
  };

  window.streetLeave = function(spotId) {
    var uid = typeof getVerifiedUserId === 'function' ? getVerifiedUserId() : null;
    if (!uid) return;
    if (window.isTableActionRunning) return;
    window.isTableActionRunning = true;

    db.runTransaction(function(t) {
      return t.get(db.collection('locations').doc(spotId)).then(function(doc) {
        if (!doc.exists) return;
        var p = (doc.data().players || []).filter(function(pl) { return (pl.uid || pl) !== uid; });
        t.set(db.collection('locations').doc(spotId), { players: p }, { merge: true });
      });
    }).then(function() {
      if (typeof vibrate === 'function') vibrate('light');
      window.isTableActionRunning = false;
    }).catch(function() {
      window.isTableActionRunning = false;
    });
  };

  window.inviteToStreetSpot = function(spotId) {
    var spot = window.getStreetSpotById(spotId);
    if (!spot) return;
    var selectEl = document.getElementById('challenge-loc-select');
    if (selectEl) {
      var existing = selectEl.querySelector('option[value="' + spotId + '"]');
      if (!existing) {
        var opt = document.createElement('option');
        opt.value = spotId;
        opt.textContent = spot.name;
        selectEl.appendChild(opt);
      }
      selectEl.value = spotId;
    }
    if (typeof openChallengeModal === 'function') openChallengeModal();
  };

  window.openStreetSpotModal = function() {
    if (typeof isSuperAdmin === 'function' && !isSuperAdmin()) return;
    if (typeof openModalSmoothly === 'function') openModalSmoothly('street-spot-modal');
  };

  window.saveStreetSpot = function() {
    if (typeof isSuperAdmin === 'function' && !isSuperAdmin()) return;
    var name = (document.getElementById('street-spot-name').value || '').trim();
    var district = (document.getElementById('street-spot-district').value || '').trim() || 'Челябинск';
    var gisUrl = (document.getElementById('street-spot-gis').value || '').trim();
    var lat = parseFloat(document.getElementById('street-spot-lat').value);
    var lng = parseFloat(document.getElementById('street-spot-lng').value);

    if ((isNaN(lat) || isNaN(lng)) && gisUrl) {
      var decoded = decodeURIComponent(gisUrl);
      var m = decoded.match(/(\d{2}\.\d+),\s*(\d{2}\.\d+)/);
      if (m) {
        var v1 = parseFloat(m[1]), v2 = parseFloat(m[2]);
        if (v1 > 58 && v2 < 58) { lng = v1; lat = v2; }
        else { lat = v1; lng = v2; }
      }
    }

    if (!name || isNaN(lat) || isNaN(lng)) {
      if (typeof customAlert === 'function') customAlert('Укажите адрес и координаты (или вставьте ссылку с координатами).');
      return;
    }

    var id = 'street_' + Date.now();
    db.collection('street_spots').doc(id).set({
      id: id,
      name: name,
      district: district,
      lat: lat,
      lng: lng,
      gisUrl: gisUrl,
      createdAt: Date.now()
    }).then(function() {
      if (typeof closeModalSmoothly === 'function') closeModalSmoothly('street-spot-modal');
      ['street-spot-name', 'street-spot-desc', 'street-spot-gis', 'street-spot-lat', 'street-spot-lng'].forEach(function(fid) {
        var el = document.getElementById(fid);
        if (el) el.value = '';
      });
      if (typeof customAlert === 'function') customAlert('✅ Адрес добавлен на карту!');
    }).catch(function(e) {
      if (typeof customAlert === 'function') customAlert('Ошибка сохранения: ' + e.message);
    });
  };

  function startStreetListeners() {
    if (typeof db === 'undefined') return;
    db.collection('street_spots').onSnapshot(function(snap) {
      var list = [];
      snap.forEach(function(doc) {
        var d = doc.data();
        if (d) { d.id = d.id || doc.id; list.push(d); }
      });
      customStreetSpots = list;
      if (currentRadarMode === 'street') renderStreetSection();
    }, function() {});

    db.collection('locations').onSnapshot(function(snap) {
      var nextMap = {};
      snap.forEach(function(doc) {
        if (doc.id && doc.id.indexOf('street_') === 0) {
          nextMap[doc.id] = doc.data() || { players: [], plans: [] };
        }
      });
      streetPresenceMap = nextMap;
      if (currentRadarMode === 'street') renderStreetSection();
    }, function() {});
  }

  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(startStreetListeners, 700);
  });
})();
