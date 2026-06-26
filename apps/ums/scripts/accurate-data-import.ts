/**
 * BMI UMS - Accurate Data Import Script
 * 
 * This script:
 * 1. Clears ALL existing data from PocketBase
 * 2. Imports study centres (formerly campuses)
 * 3. Imports courses with accurate module mapping
 * 4. Imports students with correct admission numbers (KEN-DP 225-XXX)
 * 5. Imports academic records (grades) from CSV files
 * 6. Sets all diploma students to PART-TIME mode
 * 7. Syncs everything to Google Sheets
 */

import PocketBase from 'pocketbase';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

const PB_URL = process.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090';
const pb = new PocketBase(PB_URL);

// Admin credentials
let ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL || '';
let ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD || '';

interface StudyCentre {
  id?: string;
  name: string;
  location: string;
}

interface Course {
  id?: string;
  code: string;
  title: string;
  category: string;
  credit_hours: number;
  module_name: string;
}

interface Student {
  id?: string;
  student_code: string;
  admission_no: string;
  full_name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  gender: string;
  programme: string;
  mode_of_study: string;
  status: string;
  admission_date: string;
  study_centre: string;
}

interface AcademicRecord {
  student: string;
  course: string;
  total_score: number;
  grade: string;
  grade_point: number;
  academic_year: string;
  semester: string;
}

// Grade calculation
function calculateGrade(score: number): { grade: string; grade_point: number } {
  if (score >= 90) return { grade: 'A', grade_point: 4.0 };
  if (score >= 80) return { grade: 'A-', grade_point: 3.7 };
  if (score >= 75) return { grade: 'B+', grade_point: 3.3 };
  if (score >= 70) return { grade: 'B', grade_point: 3.0 };
  if (score >= 65) return { grade: 'B-', grade_point: 2.7 };
  if (score >= 60) return { grade: 'C+', grade_point: 2.3 };
  if (score >= 55) return { grade: 'C', grade_point: 2.0 };
  if (score >= 50) return { grade: 'C-', grade_point: 1.7 };
  if (score >= 45) return { grade: 'D+', grade_point: 1.3 };
  if (score >= 40) return { grade: 'D', grade_point: 1.0 };
  if (score >= 35) return { grade: 'D-', grade_point: 0.7 };
  return { grade: 'F', grade_point: 0.0 };
}

// Authenticate admin
async function authenticateAdmin() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.log('\n📝 Admin credentials required for data import');
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    ADMIN_EMAIL = await new Promise<string>((resolve) => {
      rl.question('Admin Email: ', resolve);
    });

    ADMIN_PASSWORD = await new Promise<string>((resolve) => {
      rl.question('Admin Password: ', (answer) => {
        resolve(answer);
        rl.close();
      });
    });
  }

  try {
    await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('✅ Admin authenticated');
  } catch (error) {
    console.error('❌ Admin authentication failed:', error.message);
    process.exit(1);
  }
}

// Clear all data
async function clearAllData() {
  console.log('\n🗑️  Clearing all existing data...');
  
  const collections = ['academic_records', 'students', 'courses', 'campuses', 'modules'];
  
  for (const collection of collections) {
    try {
      const records = await pb.collection(collection).getFullList();
      console.log(`   Deleting ${records.length} records from ${collection}...`);
      
      for (const record of records) {
        await pb.collection(collection).delete(record.id);
      }
      
      console.log(`   ✅ Cleared ${collection}`);
    } catch (error) {
      console.log(`   ⚠️  ${collection}: ${error.message}`);
    }
  }
  
  console.log('✅ All data cleared');
}

// Import study centres
async function importStudyCentres(): Promise<Map<string, string>> {
  console.log('\n📍 Importing Study Centres...');
  
  const csvPath = path.join(process.cwd(), 'DATABASE', '1_campuses.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const records = parse(csvContent, { columns: true, skip_empty_lines: true });
  
  const studyCentreMap = new Map<string, string>();
  
  for (const row of records) {
    const name = row.name?.trim();
    const location = row.location?.trim();
    
    if (!name) continue;
    
    try {
      const created = await pb.collection('campuses').create({
        name,
        location: location || name,
        type: 'Study Centre',
        status: 'Active'
      });
      
      studyCentreMap.set(name, created.id);
      console.log(`   ✅ ${name}`);
    } catch (error) {
      console.error(`   ❌ ${name}: ${error.message}`);
    }
  }
  
  console.log(`✅ Imported ${studyCentreMap.size} study centres`);
  return studyCentreMap;
}

// Import courses
async function importCourses(): Promise<Map<string, string>> {
  console.log('\n📚 Importing Courses...');
  
  const csvPath = path.join(process.cwd(), 'DATABASE', '3_courses.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const records = parse(csvContent, { columns: true, skip_empty_lines: true });
  
  const courseMap = new Map<string, string>();
  
  for (const row of records) {
    const code = row.code?.trim();
    const title = row.title?.trim();
    
    if (!code || !title) continue;
    
    try {
      const created = await pb.collection('courses').create({
        code,
        title,
        category: row.category?.trim() || 'General',
        credit_hours: parseInt(row.credit_hours) || 3,
        module_name: row.module_name?.trim() || 'Module 1',
        status: 'Active'
      });
      
      courseMap.set(code, created.id);
      console.log(`   ✅ ${code} - ${title}`);
    } catch (error) {
      console.error(`   ❌ ${code}: ${error.message}`);
    }
  }
  
  console.log(`✅ Imported ${courseMap.size} courses`);
  return courseMap;
}

// Import students
async function importStudents(studyCentreMap: Map<string, string>): Promise<Map<string, string>> {
  console.log('\n👥 Importing Students...');
  
  const csvPath = path.join(process.cwd(), 'CSV FILES', 'BMI MASTER RECORDS - 07_STUDENTS.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const records = parse(csvContent, { columns: true, skip_empty_lines: true });
  
  const studentMap = new Map<string, string>();
  
  for (const row of records) {
    const admissionNo = row.student_number?.trim();
    const firstName = row.first_name?.trim();
    const lastName = row.last_name?.trim();
    
    if (!admissionNo || !firstName || !lastName) continue;
    
    const studyCentreName = row.campus?.trim();
    const studyCentreId = studyCentreMap.get(studyCentreName) || studyCentreMap.get('Karatina A');
    
    try {
      const created = await pb.collection('students').create({
        student_code: admissionNo,
        admission_no: admissionNo,
        reg_no: admissionNo,
        full_name: `${firstName} ${lastName}`,
        first_name: firstName,
        last_name: lastName,
        email: row.email?.trim() || `${admissionNo.toLowerCase().replace(/\s+/g, '')}@student.bmi.edu`,
        phone: row.phone?.trim() || '',
        gender: row.gender?.trim() || 'Male',
        programme: 'Diploma in Christian Ministry and Theology',
        mode_of_study: 'Part-time',  // ALL diploma students are part-tir);
roh(console.er).catc
}

main(eets');to Google Shauto-sync : Data will n💡 Next'\sole.log(`);
  conrt-time)L Pa} (ALap.size ${studentMdents:og(`   Stuole.l`);
  consze}si{courseMap.rses: $g(`   Coulole.
  consop.size}`);MatreCendy{stues: $ntrCe Study le.log(`  soon);
  cary:' Summlog('\n📋le.');
  consossfully!ted succemplecoData import og('\n✅ ole.l
  
  consMap);ourseudentMap, cstmbu(adesFromKiaGrit importMap);
  awasetMap, courweini(studenmMukurtGradesFrot impor
  awaieMap);rs couentMap,ript(studFromTranscGradesportwait im
  
  aeMap);ntrents(studyCetStudmpor i= awaittMap st studen con
 es();rsouwait importCourseMap = a
  const cs();tudyCentreait importSreMap = aw studyCentnst co;
  
 ata()rAllDt clea
  awain();nticateAdmihet aut
  awai
  ==\n');============================og('====
  console.lport');a ImAccurate DatBMI UMS - .log('🚀 
  consolemain() {tion c func
asynionain execut;
}

// Mm Kiambu`) frocordsde re} graed${importd portee.log(`✅ Im
  consol  }
  
    }
y
      }tllenuplicates sip d/ Ski     /    {
r: any)catch (error);
  ter 1'
    ster: 'Semes seme         5',
r: '2024/202emic_yeaacad           : 'Fail',
 ? 'Pass' >= 50rks: scoreema       rint,
     grade_po       grade,
          core,
 m_score: s   exa0,
       re:      ca_sco     ,
oreal_score: sc   tot
       e),t(courseCodp.gecourseMaurse:      co  ,
   issionNo)t(admgeudentMap. student: st       
  te({cords').creademic_relection('aca pb.col    await {
    
      try;
      ade(score)lateGrcu} = calade_point e, gr gradconst {
        tinue;
    null) con(score ===      if  string);
 alue aseScore(vore = parssc    const   
  ;
    nueconti)) missionNop.has(adudentMa || !st!admissionNo    if (
  .trim();ame]?olumnNmbers[conNudmissinNo = anst admissio     co
      
 ') continue;== 'course =nName' || colume === 'no.nNamolum    if (crow)) {
  es(.entriof Objecte] nName, valuum[col for (const lumn
   tudent coch scess eaPro   // ;
    
 )) continueodeeCas(coursourseMap.h || !curseCode if (!co
   e);rseNamouseCode(cde = getCourourseCoconst c   
    tinue;
 n')) conioudes('admiss.']?.inclow['no| r |Nameif (!courserim();
    ourse']?.t = row['ccourseName
    const  records) { of row(const for   
  = 0;
et imported
  l}
      }
  ;
reak  brow;
    = mbers ionNu    admiss)) {
  n'dmissios('audencl']?.io.'nif (row[
    ecords) {ow of rt rons (c
  for {};ing> =string, strcord<mbers: Re admissionNu
  letm last rowfroers on numb admissi 
  // Get);
  true }ty_lines: skip_emprue,lumns: t { coontent,csvC = parse(ds recoronstf-8');
  cPath, 'utFileSync(csveads.rnt = fonte const csvCcsv');
 ).et1 (5She GRADES - OMAMBU DIPL', 'KIALES), 'CSV FIcess.cwd(h.join(proth = patcsvPast  con 
 ..');
 ambu.from Kirades mporting G I\n📊le.log('
  conso) {ng>
string, striap: Map<
  courseMring>,ing, stp<str MatMap:u(
  studenKiambsFromGradeport imync functionmbu CSV
as from Kia gradesport

// Im);
}rweini`Mukurom ords fe recorted} gradmp{ited $log(`✅ Impor  console. 
  }
  }
   y
      }
tes silentlip duplica       // Skr: any) {
 catch (error)     mester 1'
ster: 'Se seme,
         4/2025'r: '202c_yea academi
         l',Fai : '? 'Pass'= 50 e >rks: scor  rema,
        ade_point   gr  ade,
              gre: score,
 _scoram   ex
       score: 0,   ca_,
       re: scoreotal_sco   t
       ourseCode),et(c courseMap.gourse:   co),
       ionNdmiss(antMap.getnt: studestude
          {create(ords').c_recion('academi.collectt pb    awai   {
 try  
      ore);
     eGrade(scculat = calnt }oi_padede, gr{ gra   const      
   ontinue;
 = null) c==e  (scor if   tring);
   s asre(valueScoore = parset scons  
      c;
    continueissionNo)) Map.has(adm || !studentNo(!admission      if      

      }
    }     break;
          admNo;
 missionNo =       adame)) {
   includes(ntName.) || studen(studentNameincludesname.if (       
 s()) {rieNameMap.entudentst, admNo] of t [namer (cons
      fo studenthingnd matc
      // Fi  ed;
    ng | undefin strimissionNo:ad
      let se().trim();werCatoLoName.= columnme dentNa   const stu  
     e;
  ontinuname') course 'cnName ===  || colum 'no.'e ===olumnNam    if (c
  ies(row)) { Object.entre, value] oflumnNamnst [coco ( for  t column
 each studencess     // Pro    
 continue;
courseCode))seMap.has(our| !c |seCodecour if (!ame);
   de(courseNCo= getCoursede seCoonst cour
    cnue;
    eName) conti if (!cours
   rim();ame']?.tow['course n= rseName ur  const co  ords) {
 rec row ofconst
  for (
  rted = 0; let impo
 
  
  });admNoullName, eMap.set(fstudentNam
    trim();se()..toLowerCanamet.full_me = studenst fullNa  conentId);
  One(studs').getdentction('stub.colle= await pnt st stude {
    cons())ntriestudentMap.e] of Identud [admNo, stnstco;
  for (ing>()string, strp = new Map<ameMat studentN  cons
ber mappingssion numame to admi student n Get;
  
  //})ines: true mpty_l, skip_es: truet, { columne(csvContenrsrecords = pa
  const );ath, 'utf-8'(csvPeSyncfs.readFil = Contentsvst csv');
  con).ceet2 (5GRADES  - Shass Final UKURWEINI ClOMA M 'DIPLFILES',V wd(), 'CSin(process.cth = path.jocsvPat 
  
  consni...');Mukurweiom des frraing G Import\n📊.log('nsole
) {
  coring>string, strseMap: Map<>,
  coung, stringtriMap<sudentMap:   sturweini(
FromMukadesion importGrnc functini CSV
asy Mukurwes fromrt gradepo
// Im

}ipt`);ranscrfrom tade records ed} gr{importImported $le.log(`✅ onso
  
  c
    }
  }      }ntly
s sileicateplip du   // Sk
      any) {ch (error:} cat    
  mported++;      i  
        
;
        })Semester 1'semester: '
          ',/2025r: '2024ademic_yea        acl',
  Pass' : 'Faire >= 50 ? 'sco   remarks:       ,
 grade_point
          grade,      core,
    score: s     exam_     e: 0,
scor     ca_re,
     : scootal_score    t    ode),
  t(courseCurseMap.ge: co course
         udentId,nt: st stude       te({
  cords').creaacademic_ren('llectio pb.co  awaitry {
       
      tore);
     de(scGra= calculate_point } grade, grade const {     
     tinue;
   null) conore ===(sc      if string);
e as (valureScorse paore = const sc     
     tinue;
 eCode)) concoursap.has(courseMe || !seCodf (!cour
      iame);Code(columnN getCourseCode =onst course      c 
 }
     
     continue;      H') {
  SE PATme === 'COURlumnNaENDER' || co'G== columnName =L' || MAIE-= 'mnName ==        colu
  E NO.' || ON= 'PHame ==lumnNN NO.' || coSIO= 'ADMISame ==olumnN          c|| 
' dy centre 'stulumnName ===|| coent name'  'studame ===olumnN|| ce  (!valu  if{
    ies(row)) ct.entrlue] of ObjenName, valum (const [co  formn
  lu course co eachessoc// Pr
    
    sionNo)!;t(admis.geapudentMId = stdentst stu  con    
  e;
continu)) missionNos(adMap.hadent || !stuadmissionNo(!    if im();
NO.']?.tr'ADMISSION w[ionNo = rot admiss   cons
 s) {recordof  row for (const
  
  d = 0;te impor  
  lettrue });
y_lines: , skip_empts: true, { columnente(csvContords = pars rec consttf-8');
 Path, 'uleSync(csveadFitent = fs.rvConst cssv');
  con (5).ceet1RIPT) - ShNCE (TRANSCTS PERFORMAUDEN'diploma STSV FILES', wd(), 'Cin(process.cath.joth = pPa  const csv
  
...');scriptanTrrades from orting Gog('\n📊 Impe.l
  consolng>
) {trip<string, s: MaapcourseM
   string>,Map<string,p: tMat(
  studenripmTranscesFromportGradon iasync functiCSV
script ranades from tport gr

// Im: null;
} ? score re <= 100)co && s 0score >=(score) &&  (!isNaN
  return;
  t(cleaned)rseFloae = pa scornst');
  co, '(/[^\d.]/glaceim().rep).trtr.toString(d = scoreSconst cleane;
  
  turn nulleStr) re if (!scor{
 mber | null ng): nu: strioreStrseScore(scnction parring
fucore from strse s
// Pa
}
 || null;d]ormalizemeMap[nurn courseNae();
  rettoUpperCase.trim().urseNam = coizedst normalll {
  connug | trin): sringsturseName: e(coodrseCetCoution g
funcR 225'
};
': 'SPAL REAME SPIRITU
  'TH',R 225SPEALM': 'PIRITUAL R',
  'S': 'MWR 228NSELIGIOJOR WORLD RMA
  '8', 22: 'MWR RELIGION',
  'WORLD: 'PCE 227'THICS'ING AND ELL COUNSE  'PASTORALCE 227',
 'P':THICSNG&ENSELLITORAL COU5',
  'PASY': 'FSM 21INISTRUCCESSFUL M SON OFDATI
  'FOUN',SPW 224RE': 'WELFAPIRITUAL   'SW 224',
RFARE': 'SPIRITUAL WA',
  'SPCHH 122': 'STORY'CHURCH HI 116',
  LY': 'CFMFAMI 'CHRISTIAN T 125',
 LOGY': 'SOSOTERIO 123',
  ': 'THPPER'LOGY PRO
  'THEO213',CHG : ' GROWTH'URCH
  'CH 'APO 226',OLOGETICS':HRISTIAN AP 'C
 APO 226',ETICS': 'POLOG
  'A','UKP 218ING GODS': STAND
  'UNDER 'UKP 218',': PRINCIPLESGDOMKIN11',
  'C 2Y': 'ECLESIOLOG02',
  'ECCG': 'AWR 1C WRITINACADEMI',
  '101AR': 'ENG GLISH GRAMM 'BASIC EN
  'CHP 214',ANTING':H PL  'CHURC
 'SPF 216',ION':AL FORMAT
  'SPIRITURW 127',': 'PRSHIP AND WORAISE
  'P27',': 'PRW 1SE & WORSHIP 'PRAIK 311',
 'GREEK': AL GR  'BIBLIC11',
E': 'GRK 3ANGUAGK L  'GREE 312',
BREW': 'HEBHEBLICAL   'BI312',
HEB ': 'GUAGEEBREW LAN',
  'H': 'NTS 112T SURVEYESTAMEN',
  'NEW TNTS 112 'RVEY':
  'N.T. SU,11'Y': 'OTS 1ENT SURVETESTAM
  'OLD  111',: 'OTSVEY'. SUR  'O.T 223',
OGY': 'ANHHAMARTIOL',
  '223OGY': 'ANH  HARMATIOL &ANTHROPOLOGY 113',
  '': 'BIBIBLIOLOGY222',
  'BOGY': 'ANG LOL  'ANGEG 222',
: 'ANOGY'ONOLOLOGY & DEMEL4',
  'ANGR 12: 'CHGY'ISTOLO',
  'CHR: 'ESC 221GY'HATOLOISTIAN ESC  'CHR 221',
OLOGY': 'ESCSCHAT115',
  'EA EVSM': 'NGELI,
  'EVA212'D 'CAION': INISTRATCH ADM',
  'CHURN': 'CAD 212MIRCH AD  'CHU212',
ON': 'CAD STRATIADMIN'CHURCH  217',
   'POSS': OF SUCCESCIPLE7',
  'PRINS': 'POS 21CCES SUOFINCIPLES PR  ',
26'E 1: 'PNOGY'  'PNEUMATOL21',
': 'HOM 1OMILETICS
  'HHER 114',: 'ENEUTICS'BLICAL HERM114',
  'BICS': 'HER ENEUTI'HERM = {
  tring>rd<string, smeMap: Recot courseNa
consappinge m/ Course nam

/tMap;
}eturn studen`);
  rt-time mode)t to Par (ALL se studentsp.size}{studentMated $(`✅ Impor.log  console
  }
  

    }ssage}`); ${error.meo}:issionN  ❌ ${admor(`  console.error {
     error: any) (} catch
    `);CentreName})e} (${studystNamme} ${la - ${firstNanNo}admissio   ✅ ${sole.log(`      cond.id);
nNo, create(admissioMap.set student    
      
 });01'
      1-rth: '1990-0_biate_of     d',
   ity: 'Kenyannational      reId,
  : studyCentampus   c    01-15',
 '2024-?.trim() || date.admission_ow_date: r   admissionive',
     Act() || 'status?.trimrow.atus: 
        stme





