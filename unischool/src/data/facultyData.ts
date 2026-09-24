import { quirkForId } from './quirkData';
import type { Faculty } from '../state/types';
import { WEEKS_PER_YEAR } from '../state/types';
import { initialTech } from './techData';
import { random, newId } from '../engine/random';

// ---------------------------------------------------------------------
// Name generation. Each pool has a cultural origin; the first-name pool is
// a weighted draw (pickPool), and the surname comes from the same pool
// SAME_ORIGIN_NAME_WEIGHT of the time, so mixed-origin names occur as the
// minority case. The Anglo/Western European pool is the deepest because it
// is drawn most (half of faculty, more of coaches) and its depth decides
// whether names repeat across a coach market that churns ~78 candidates a
// year. Chinese/Korean/Japanese and West/East African are separate pools
// because their names don't mix; each split pool keeps only its share of
// the region's weight.
//
// `last` doubles as the donor/alumni surname source (rollSurname), so keep
// it generic. First names are tied to Faculty.gender because gender drives
// FacultyPortrait.tsx's presentation.
// ---------------------------------------------------------------------
interface NamePool {
  origin: string;
  firstMale: string[];
  firstFemale: string[];
  last: string[];
  weight: number;
}

function firstNamesFor(pool: NamePool, gender: 'male' | 'female'): string[] {
  return gender === 'male' ? pool.firstMale : pool.firstFemale;
}

// Relative weight for pool selection, not pool size. Anglo/Western European
// gets 6 of 12 shares (50%); each other original region gets 1 (~8.3%).
// Split regions divide their region's single share (Chinese/Korean/Japanese
// at 1/3 each, West/East African at 1/2), keeping the region's total.
const ANGLO_POOL_WEIGHT = 6;
const OTHER_POOL_WEIGHT = 1;

// Exported for test/coach-names.test.ts's content checks; every draw goes
// through pickPool.
export const NAME_POOLS: readonly NamePool[] = [
  // Within each pool a name is either a given name or a surname, never
  // both, so a draw can't produce "Liang Liang".
  {
    origin: 'Chinese',
    firstMale: [
      'Wei', 'Jun', 'Feng', 'Hao', 'Chao', 'Xiang', 'Long', 'Bo', 'Cheng', 'Gang',
      'Jian', 'Jie', 'Lei', 'Ming', 'Qiang', 'Tao', 'Wen', 'Xiao', 'Yong', 'Zhi',
      'Bin', 'Dong', 'Guang', 'Rui', 'Zhen',
    ],
    firstFemale: [
      'Mei', 'Xin', 'Li', 'Fang', 'Jing', 'Ying', 'Hui', 'Hong', 'Hua', 'Lan',
      'Lian', 'Ling', 'Min', 'Ning', 'Qing', 'Rong', 'Shan', 'Ting', 'Xia', 'Xue',
      'Yue', 'Yun', 'Yuan', 'Fen', 'Shu',
    ],
    last: [
      'Zhang', 'Chen', 'Liu', 'Wang', 'Huang', 'Zhou', 'Yang', 'Wu', 'Zhao', 'Sun',
      'Ma', 'Zhu', 'Hu', 'Guo', 'Lin', 'He', 'Gao', 'Luo', 'Zheng', 'Liang',
      'Xu', 'Song', 'Tang', 'Cao', 'Deng', 'Xie', 'Pan', 'Jiang', 'Ye', 'Tan',
      'Fan', 'Lu', 'Du', 'Cai', 'Shen',
    ],
    weight: OTHER_POOL_WEIGHT / 3,
  },
  {
    origin: 'Korean',
    firstMale: [
      'Minjun', 'Seojin', 'Jihoon', 'Dohyun', 'Sungmin', 'Taehyun', 'Jinwoo', 'Hyunwoo', 'Junseo', 'Seungmin',
      'Youngho', 'Sangwoo', 'Kyungsoo', 'Hyunjin', 'Jaemin', 'Donghyun', 'Woojin', 'Yejun', 'Siwoo', 'Jisung',
      'Hojun', 'Byungho', 'Kangmin', 'Namjoon', 'Joonho',
    ],
    firstFemale: [
      'Sooah', 'Hana', 'Jiwoo', 'Yerin', 'Minji', 'Soyeon', 'Eunji', 'Yuna', 'Seoyeon', 'Jieun',
      'Chaewon', 'Hyejin', 'Sujin', 'Eunbi', 'Nayeon', 'Dahyun', 'Hyerin', 'Jiyoung', 'Sohee', 'Yeji',
      'Hayoon', 'Boyoung', 'Miyoung', 'Seulgi', 'Jimin',
    ],
    last: [
      'Kim', 'Park', 'Lee', 'Choi', 'Jung', 'Yoon', 'Kang', 'Cho', 'Yoo', 'Jang',
      'Lim', 'Han', 'Shin', 'Oh', 'Seo', 'Kwon', 'Hwang', 'Ahn', 'Ryu', 'Jeon',
      'Moon', 'Bae', 'Baek', 'Nam', 'Koo',
    ],
    weight: OTHER_POOL_WEIGHT / 3,
  },
  {
    origin: 'Japanese',
    firstMale: [
      'Haruto', 'Ren', 'Sora', 'Yuto', 'Kaito', 'Daiki', 'Riku', 'Hiroshi', 'Takeshi', 'Kenji',
      'Yusuke', 'Takumi', 'Shota', 'Kenta', 'Ryota', 'Daisuke', 'Tatsuya', 'Naoki', 'Kazuki', 'Satoshi',
      'Makoto', 'Ichiro', 'Koji', 'Shun', 'Hayato', 'Tsubasa', 'Itsuki', 'Minato', 'Asahi', 'Taro',
    ],
    firstFemale: [
      'Yuki', 'Aiko', 'Sakura', 'Rin', 'Emi', 'Yui', 'Nanami', 'Haruka', 'Misaki', 'Ayumi',
      'Mio', 'Miyu', 'Hinata', 'Kanna', 'Akari', 'Riko', 'Ayaka', 'Kaori', 'Keiko', 'Mika',
      'Natsuki', 'Saki', 'Mai', 'Chiyo', 'Hitomi', 'Nao', 'Yoko', 'Tomoko', 'Rika', 'Sayuri',
    ],
    last: [
      'Tanaka', 'Nakamura', 'Sato', 'Watanabe', 'Kobayashi', 'Suzuki', 'Yamamoto', 'Ito', 'Takahashi', 'Yamada',
      'Yoshida', 'Sasaki', 'Matsumoto', 'Inoue', 'Kimura', 'Hayashi', 'Shimizu', 'Yamaguchi', 'Mori', 'Abe',
      'Ikeda', 'Hashimoto', 'Ishikawa', 'Ogawa', 'Fujita', 'Okada', 'Goto', 'Hasegawa', 'Murakami', 'Kondo',
      'Ishii', 'Saito', 'Sakamoto', 'Endo', 'Aoki', 'Fujii', 'Nishimura', 'Fukuda', 'Miura', 'Takeda',
      'Nakajima', 'Kato', 'Maeda', 'Ono',
    ],
    weight: OTHER_POOL_WEIGHT / 3,
  },
  {
    origin: 'South Asian',
    firstMale: [
      'Arjun', 'Rohan', 'Vikram', 'Karan', 'Ishaan', 'Farhan', 'Aarav', 'Aditya', 'Akash', 'Amit',
      'Anand', 'Anil', 'Ankit', 'Ashok', 'Deepak', 'Dev', 'Gaurav', 'Harsh', 'Imran', 'Kabir',
      'Manish', 'Mohan', 'Naveen', 'Neel', 'Nikhil', 'Pranav', 'Rahul', 'Raj', 'Rajesh', 'Ravi',
      'Rishi', 'Sachin', 'Sameer', 'Sanjay', 'Siddharth', 'Suresh', 'Varun', 'Vijay', 'Vinay', 'Vivek',
      'Yash', 'Zain',
    ],
    firstFemale: [
      'Priya', 'Ananya', 'Divya', 'Meera', 'Anika', 'Nadia', 'Riya', 'Aditi', 'Aishwarya', 'Amrita',
      'Anjali', 'Asha', 'Bhavna', 'Deepa', 'Farida', 'Gita', 'Isha', 'Jaya', 'Kavya', 'Kiran',
      'Lakshmi', 'Madhuri', 'Mansi', 'Neha', 'Nisha', 'Pooja', 'Rani', 'Rekha', 'Sanjana', 'Shreya',
      'Simran', 'Sneha', 'Sunita', 'Swati', 'Tanvi', 'Uma', 'Usha', 'Vidya', 'Zara', 'Ayesha',
    ],
    last: [
      'Patel', 'Sharma', 'Gupta', 'Nair', 'Rao', 'Iyer', 'Chowdhury', 'Singh', 'Reddy', 'Bose',
      'Ahmed', 'Khan', 'Menon', 'Desai', 'Agarwal', 'Bhatt', 'Bhattacharya', 'Chandra', 'Chatterjee', 'Das',
      'Dutta', 'Ganguly', 'Hussain', 'Jain', 'Joshi', 'Kapoor', 'Kaur', 'Krishnan', 'Kulkarni', 'Kumar',
      'Malhotra', 'Mehta', 'Mishra', 'Mukherjee', 'Naidu', 'Pandey', 'Pillai', 'Prasad', 'Raman', 'Saxena',
      'Sen', 'Sethi', 'Shah', 'Srinivasan', 'Subramanian', 'Verma', 'Venkatesh', 'Yadav',
    ],
    weight: OTHER_POOL_WEIGHT,
  },
  {
    origin: 'Anglo/Western European',
    firstMale: [
      'John', 'Daniel', 'William', 'Thomas', 'James', 'Henry', 'Michael', 'Robert', 'David', 'Richard',
      'Charles', 'Joseph', 'Andrew', 'Matthew', 'Christopher', 'Edward', 'George', 'Patrick', 'Peter', 'Samuel',
      'Benjamin', 'Nathan', 'Stephen', 'Paul', 'Mark', 'Luke', 'Jack', 'Oliver', 'Harry', 'Ryan',
      'Kevin', 'Brian', 'Sean', 'Liam', 'Owen', 'Connor', 'Nicholas', 'Alexander', 'Jonathan', 'Timothy',
      'Gregory', 'Scott', 'Eric', 'Adam', 'Aaron', 'Jacob', 'Ethan', 'Simon', 'Martin', 'Philip',
      'Anthony', 'Frank', 'Walter', 'Dennis', 'Gary', 'Bruce', 'Wayne', 'Keith', 'Craig', 'Todd',
      'Dean', 'Glenn', 'Neil', 'Ian', 'Colin', 'Malcolm', 'Stuart', 'Duncan', 'Angus', 'Callum',
      'Hugh', 'Rory', 'Alistair', 'Ewan', 'Lachlan', 'Declan', 'Cormac', 'Niall', 'Lars', 'Klaus',
    ],
    firstFemale: [
      'Emily', 'Grace', 'Alice', 'Charlotte', 'Olivia', 'Sarah', 'Emma', 'Hannah', 'Rachel', 'Rebecca',
      'Laura', 'Katherine', 'Elizabeth', 'Margaret', 'Eleanor', 'Claire', 'Anna', 'Lucy', 'Sophie', 'Ellen',
      'Helen', 'Mary', 'Jane', 'Ruth', 'Susan', 'Julia', 'Caroline', 'Victoria', 'Abigail', 'Isabel',
      'Megan', 'Amy', 'Jessica', 'Lauren', 'Natalie', 'Nicole', 'Heather', 'Erin', 'Kelly', 'Bridget',
      'Fiona', 'Siobhan', 'Maeve', 'Catriona', 'Isla', 'Freya', 'Amelia', 'Chloe', 'Ella', 'Lily',
      'Molly', 'Rose', 'Florence', 'Harriet', 'Beatrice', 'Louise', 'Leah', 'Naomi', 'Diana', 'Joan',
      'Carol', 'Linda', 'Karen', 'Barbara', 'Nancy', 'Patricia', 'Judith', 'Frances', 'Marion', 'Gwen',
      'Eilidh', 'Niamh', 'Orla', 'Roisin', 'Astrid', 'Greta', 'Ingrid', 'Annika', 'Maren', 'Sigrid',
    ],
    last: [
      'Reid', 'Byrne', 'Coleman', 'Whitfield', 'Bennett', 'Hayes', 'Sinclair', 'Murphy', 'Fitzgerald', 'Walsh',
      'Schmidt', 'Fraser', 'Douglas', 'Kennedy', 'Anderson', 'Baker', 'Brooks', 'Campbell', 'Carter', 'Clarke',
      'Collins', 'Cooper', 'Davies', 'Edwards', 'Evans', 'Foster', 'Graham', 'Griffin', 'Hamilton', 'Harper',
      'Harrison', 'Hughes', 'Jenkins', 'Lambert', 'Lawson', 'MacLeod', 'Marshall', 'Mason', 'Mitchell', 'Morgan',
      'Morrison', 'Murray', "O'Brien", "O'Connor", 'Palmer', 'Parker', 'Pearson', 'Price', 'Quinn', 'Richardson',
      'Roberts', 'Robinson', 'Russell', 'Shaw', 'Spencer', 'Stewart', 'Sullivan', 'Thompson', 'Turner', 'Wallace',
      'Ward', 'Watson', 'Webb', 'Weber', 'Wright', 'Young', 'Becker', 'Hoffmann', 'Keller', 'Meyer',
      'Wagner', 'Dubois', 'Laurent', 'Moreau', 'Lindqvist', 'Berg', 'Nilsen', 'Holm', 'Van der Berg', 'De Vries',
      'Brennan', 'Doyle', 'Gallagher', 'Kavanagh', 'Nolan', 'Reilly', 'Burns', 'Crawford', 'Lindsay', 'Ferguson',
      'Grant', 'Henderson', 'MacDonald', 'McKenzie', 'Ross', 'Blackwood', 'Ashford', 'Pemberton', 'Hollis', 'Winslow',
    ],
    weight: ANGLO_POOL_WEIGHT,
  },
  {
    origin: 'Hispanic/Latin American',
    firstMale: [
      'Mateo', 'Diego', 'Javier', 'Santiago', 'Alejandro', 'Emilio', 'Rafael', 'Andres', 'Carlos', 'Eduardo',
      'Fernando', 'Gabriel', 'Hector', 'Ignacio', 'Joaquin', 'Jorge', 'Jose', 'Juan', 'Luis', 'Manuel',
      'Marco', 'Miguel', 'Nicolas', 'Pablo', 'Ricardo', 'Roberto', 'Sergio', 'Adrian', 'Cesar', 'Felipe',
      'Gonzalo', 'Hugo', 'Ramon', 'Raul', 'Esteban', 'Rodrigo', 'Alvaro', 'Enrique', 'Julio', 'Mauricio',
    ],
    firstFemale: [
      'Sofia', 'Camila', 'Valentina', 'Lucia', 'Isabella', 'Gabriela', 'Paula', 'Adriana', 'Alejandra', 'Ana',
      'Andrea', 'Beatriz', 'Carmen', 'Carolina', 'Catalina', 'Clara', 'Daniela', 'Fernanda', 'Ines', 'Josefina',
      'Juliana', 'Lorena', 'Luciana', 'Mariana', 'Marisol', 'Natalia', 'Pilar', 'Rocio', 'Rosa', 'Teresa',
      'Valeria', 'Veronica', 'Ximena', 'Yolanda', 'Elisa', 'Guadalupe', 'Marta', 'Silvia', 'Renata', 'Blanca',
    ],
    last: [
      'Costa', 'Moreno', 'Reyes', 'Herrera', 'Silva', 'Torres', 'Vega', 'Garcia', 'Rodriguez', 'Fernandez',
      'Castillo', 'Ortiz', 'Aguilar', 'Navarro', 'Alvarez', 'Cruz', 'Delgado', 'Diaz', 'Dominguez', 'Espinoza',
      'Flores', 'Gomez', 'Gutierrez', 'Jimenez', 'Lopez', 'Martinez', 'Medina', 'Mendoza', 'Molina', 'Morales',
      'Munoz', 'Nunez', 'Pena', 'Perez', 'Ramirez', 'Ramos', 'Rivera', 'Romero', 'Ruiz', 'Salazar',
      'Sanchez', 'Santos', 'Suarez', 'Vargas', 'Vasquez', 'Vidal', 'Villanueva', 'Cabrera', 'Ochoa', 'Serrano',
    ],
    weight: OTHER_POOL_WEIGHT,
  },
  {
    origin: 'Arabic/Middle Eastern',
    firstMale: [
      'Omar', 'Hassan', 'Amir', 'Karim', 'Tarek', 'Rami', 'Youssef', 'Ali', 'Bilal', 'Faisal',
      'Hamza', 'Ibrahim', 'Jamal', 'Khalid', 'Mahmoud', 'Malik', 'Mustafa', 'Nabil', 'Nadim', 'Rashid',
      'Sami', 'Samir', 'Tariq', 'Walid', 'Yahya', 'Zaid', 'Ziad', 'Adel', 'Bassam', 'Fadi',
      'Ghassan', 'Hisham', 'Kamal', 'Marwan', 'Saeed', 'Salim', 'Fouad', 'Elias', 'Nizar', 'Ayman',
    ],
    firstFemale: [
      'Fatima', 'Layla', 'Yasmin', 'Sara', 'Nour', 'Dina', 'Rana', 'Aisha', 'Amal', 'Amira',
      'Asma', 'Dalia', 'Farah', 'Hala', 'Huda', 'Iman', 'Jamila', 'Lina', 'Maha', 'Malak',
      'Mariam', 'Maya', 'Mona', 'Najla', 'Rania', 'Reem', 'Rima', 'Salma', 'Samira', 'Sana',
      'Soraya', 'Yara', 'Zahra', 'Zeina', 'Ghada', 'Hanan', 'Lamia', 'Nadine', 'Sahar', 'Widad',
    ],
    last: [
      'Nasser', 'Farouk', 'Haddad', 'Khalil', 'Aziz', 'Saleh', 'Mansour', 'Rahman', 'Zaidan', 'Qureshi',
      'Sabbagh', 'Fawzy', 'Hakim', 'Barakat', 'Abbas', 'Abdallah', 'Amin', 'Ayoub', 'Bishara', 'Darwish',
      'Fahmy', 'Ghanem', 'Habib', 'Hamdan', 'Jaber', 'Kanaan', 'Karam', 'Khoury', 'Maalouf', 'Mourad',
      'Najjar', 'Osman', 'Radwan', 'Rizk', 'Saad', 'Salem', 'Shaheen', 'Shehata', 'Sultan', 'Taha',
      'Zaki', 'Zayed', 'Hijazi', 'Awad', 'Boulos', 'Sarkis',
    ],
    weight: OTHER_POOL_WEIGHT,
  },
  {
    origin: 'Slavic/Eastern European',
    firstMale: [
      'Ivan', 'Dmitri', 'Viktor', 'Milan', 'Pavel', 'Tomas', 'Stefan', 'Aleksandr', 'Andrei', 'Anton',
      'Boris', 'Bogdan', 'Dragan', 'Filip', 'Igor', 'Jakub', 'Jan', 'Josef', 'Karel', 'Krzysztof',
      'Lukas', 'Marko', 'Mateusz', 'Maxim', 'Mikhail', 'Miroslav', 'Nikola', 'Nikolai', 'Oleg', 'Ondrej',
      'Petr', 'Piotr', 'Radek', 'Roman', 'Sergei', 'Vladimir', 'Yuri', 'Zoran', 'Goran', 'Vaclav',
    ],
    firstFemale: [
      'Elena', 'Katarina', 'Nadia', 'Anya', 'Zofia', 'Irina', 'Olga', 'Agnieszka', 'Aleksandra', 'Alina',
      'Anastasia', 'Daria', 'Dominika', 'Ewa', 'Galina', 'Ivana', 'Jana', 'Jelena', 'Karolina', 'Kristina',
      'Ksenia', 'Lena', 'Lidia', 'Ljubica', 'Ludmila', 'Magdalena', 'Maja', 'Marija', 'Milena', 'Natasha',
      'Nina', 'Oksana', 'Petra', 'Polina', 'Svetlana', 'Tatiana', 'Tereza', 'Vera', 'Veronika', 'Zuzana',
    ],
    last: [
      'Novak', 'Petrov', 'Kowalski', 'Horvat', 'Ivanov', 'Dvorak', 'Sokolov', 'Marek', 'Zielinski', 'Vasiliev',
      'Jovanovic', 'Nowak', 'Kucera', 'Baran', 'Andreev', 'Babic', 'Bartos', 'Belov', 'Blazek', 'Cerny',
      'Dimitrov', 'Fedorov', 'Gorski', 'Hruby', 'Jankowski', 'Jelinek', 'Kaminski', 'Kolar', 'Kovac', 'Kozlov',
      'Kral', 'Kuznetsov', 'Lewandowski', 'Mazur', 'Morozov', 'Novotny', 'Pavlov', 'Popov', 'Prochazka', 'Radic',
      'Smirnov', 'Stankovic', 'Svoboda', 'Tomic', 'Urban', 'Vlach', 'Volkov', 'Wisniewski', 'Wojcik', 'Zajac',
    ],
    weight: OTHER_POOL_WEIGHT,
  },
  // West African: Nigerian, Ghanaian and Senegalese/Malian names. East
  // African: Kenyan, Tanzanian and Ugandan. Names used as either given name
  // or surname are filed on one side only.
  {
    origin: 'West African',
    firstMale: [
      'Kwame', 'Chidi', 'Kofi', 'Femi', 'Tunde', 'Kwesi', 'Emeka', 'Adebayo', 'Chinedu', 'Ikenna',
      'Obinna', 'Uche', 'Nnamdi', 'Segun', 'Yemi', 'Kojo', 'Kobina', 'Yaw', 'Fiifi', 'Ato',
      'Mamadou', 'Ousmane', 'Moussa', 'Ibrahima', 'Cheikh', 'Amadou', 'Babacar', 'Sekou', 'Lamine', 'Kelechi',
      'Ifeanyi', 'Tobi', 'Damilola', 'Ayodele', 'Dayo', 'Chukwuemeka', 'Ekow', 'Nana', 'Modou', 'Boubacar',
    ],
    firstFemale: [
      'Amara', 'Adaeze', 'Zainab', 'Ngozi', 'Abena', 'Fatou', 'Ifeoma', 'Chiamaka', 'Chioma', 'Nneka',
      'Obiageli', 'Adanna', 'Oluwaseun', 'Yewande', 'Folake', 'Bisi', 'Funmi', 'Temitope', 'Titilayo', 'Ama',
      'Akosua', 'Adwoa', 'Efua', 'Esi', 'Yaa', 'Aminata', 'Awa', 'Mariama', 'Bintou', 'Coumba',
      'Oumou', 'Adaora', 'Uchenna', 'Kemi', 'Ronke', 'Sade', 'Adaku', 'Ijeoma', 'Morayo', 'Ndeye',
    ],
    last: [
      'Okafor', 'Mensah', 'Adeyemi', 'Nwosu', 'Diallo', 'Osei', 'Balogun', 'Owusu', 'Sow', 'Achebe',
      'Boateng', 'Abiodun', 'Danso', 'Toure', 'Okonkwo', 'Okoro', 'Eze', 'Nwachukwu', 'Obi', 'Okeke',
      'Igwe', 'Chukwuma', 'Onyeka', 'Afolabi', 'Akinyemi', 'Bello', 'Ojo', 'Oyelaran', 'Oyelowo', 'Salami',
      'Ogunleye', 'Olawale', 'Adjei', 'Agyemang', 'Amoako', 'Appiah', 'Asante', 'Bonsu', 'Frimpong', 'Gyasi',
      'Kwarteng', 'Opoku', 'Quaye', 'Ndiaye', 'Sarr', 'Faye', 'Ba', 'Cisse', 'Kane', 'Mbaye',
      'Diop', 'Gueye', 'Seck', 'Thiam', 'Sy', 'Camara', 'Keita', 'Kone', 'Coulibaly', 'Traore',
    ],
    weight: OTHER_POOL_WEIGHT / 2,
  },
  {
    origin: 'East African',
    firstMale: [
      'Otieno', 'Kiprotich', 'Wekesa', 'Juma', 'Baraka', 'Kiptoo', 'Omondi', 'Hamisi', 'Rashidi', 'Bakari',
      'Jabari', 'Faraji', 'Hasani', 'Mosi', 'Tumaini', 'Zuberi', 'Ochieng', 'Onyango', 'Okoth', 'Owino',
      'Kipchumba', 'Kiprono', 'Kibet', 'Kipkoech', 'Kiplimo', 'Wafula', 'Wanjala', 'Simiyu', 'Barasa', 'Mukasa',
      'Okello', 'Opio', 'Mugisha', 'Tumusiime', 'Kizza', 'Mwita', 'Selemani', 'Hamadi', 'Gitau', 'Waweru',
    ],
    firstFemale: [
      'Wanjiru', 'Akinyi', 'Chebet', 'Zawadi', 'Naliaka', 'Nyokabi', 'Amani', 'Wanjiku', 'Njeri', 'Wambui',
      'Wairimu', 'Muthoni', 'Waithera', 'Nyambura', 'Wangari', 'Achieng', 'Adhiambo', 'Atieno', 'Awuor', 'Anyango',
      'Auma', 'Jepkosgei', 'Jeptoo', 'Chepkoech', 'Cherono', 'Chelagat', 'Jerono', 'Nekesa', 'Nafula', 'Nasimiyu',
      'Nanjala', 'Neema', 'Rehema', 'Subira', 'Zuri', 'Imani', 'Halima', 'Nakato', 'Namutebi', 'Nalubega',
      'Babirye', 'Nabirye', 'Namusoke', 'Kirabo',
    ],
    last: [
      'Mwangi', 'Kamau', 'Njoroge', 'Cheruiyot', 'Odhiambo', 'Kimani', 'Wanyama', 'Kipchoge', 'Kiplagat', 'Rotich',
      'Kosgei', 'Chepkwony', 'Koech', 'Lagat', 'Rono', 'Tanui', 'Bett', 'Sang', 'Kirui', 'Odera',
      'Oduya', 'Ouma', 'Kariuki', 'Njuguna', 'Karanja', 'Maina', 'Ndungu', 'Gichuru', 'Kihara', 'Macharia',
      'Muriuki', 'Wachira', 'Wanyonyi', 'Masinde', 'Shikuku', 'Ssemakula', 'Byaruhanga', 'Lubega', 'Nsubuga', 'Ssentongo',
      'Musisi', 'Kabuye', 'Mwinyi', 'Mrema', 'Mushi', 'Massawe', 'Lyimo', 'Mbwana', 'Kessy', 'Kimaro',
      'Shayo', 'Swai', 'Mtui', 'Mmari',
    ],
    weight: OTHER_POOL_WEIGHT / 2,
  },
];

// Chance the surname comes from the first name's pool. Below 1 so
// mixed-heritage names still occur.
const SAME_ORIGIN_NAME_WEIGHT = 0.85;

// ---------------------------------------------------------------------
// Faculty fields = the university's departments. A hire, a listing and a
// course's requiresFaculty each name exactly one field (techData.ts gives
// every major one `field`; a graduate course names its own). The set is
// shaped like a real catalog's department list and chosen so demand lands
// evenly: every field carries roughly 8-20 courses.
//
// This order is the order the Faculty tab lists departments in (see
// FacultyTab.tsx).
//
// Adding or renaming a field is a save-compatibility event: a saved faculty
// member stores their field as a plain string. Bump SAVE_VERSION
// (persistence.ts).
//
// Divisions group departments for display. They are not schools: a field
// can teach in several schools (techData's researchSchools()), but belongs
// to exactly one division.
// ---------------------------------------------------------------------
export interface FacultyFieldGroup {
  name: string;
  fields: string[];
}

export const FACULTY_FIELD_GROUPS: FacultyFieldGroup[] = [
  { name: 'Humanities & arts', fields: ['English', 'History', 'Philosophy', 'Communication', 'Art & Design', 'Music'] },
  { name: 'Social sciences', fields: ['Economics', 'Political Science', 'Psychology', 'Sociology'] },
  { name: 'Natural sciences & mathematics', fields: ['Mathematics', 'Physics', 'Chemistry', 'Biology'] },
  { name: 'Health', fields: ['Public Health', 'Clinical Health', 'Neuroscience', 'Kinesiology'] },
  { name: 'Computing', fields: ['Computer Science', 'Artificial Intelligence', 'Information Systems'] },
  { name: 'Engineering', fields: ['Mechanical Engineering', 'Electrical Engineering', 'Civil Engineering', 'Operations Research'] },
  { name: 'Business', fields: ['Accounting & Finance', 'Marketing', 'Management'] },
  // Law is the one field no existing department could cover; hanging the
  // law school off Political Science would let a politics hire staff law
  // courses. Its demand is entirely graduate, hence its own market-supply
  // entry below.
  { name: 'Law', fields: ['Law'] },
];

// Every field, in division order, derived from the groups so the two can't
// drift.
export const FACULTY_FIELDS = FACULTY_FIELD_GROUPS.flatMap((group) => group.fields);

function pick<T>(pool: T[]): T {
  return pool[Math.floor(random() * pool.length)];
}

// A weighting over NAME_POOLS: one weight per pool, in NAME_POOLS order,
// plus their sum. The origin mix is chosen at the call site.
interface PoolWeighting {
  weights: readonly number[];
  total: number;
}

function weighting(weights: readonly number[]): PoolWeighting {
  return { weights, total: weights.reduce((sum, w) => sum + w, 0) };
}

const FACULTY_POOL_WEIGHTS: PoolWeighting = weighting(NAME_POOLS.map((pool) => pool.weight));

// Coaches are drawn more Anglo/American than faculty (70% vs 50%): American
// coaching careers are mostly domestic, where faculty are recruited
// worldwide. Every other region keeps its OTHER_POOL_WEIGHT share of the
// remainder.
const COACH_ANGLO_POOL_WEIGHT = 14;
const ANGLO_ORIGIN = 'Anglo/Western European';
const COACH_POOL_WEIGHTS: PoolWeighting = weighting(
  NAME_POOLS.map((pool) => (pool.origin === ANGLO_ORIGIN ? COACH_ANGLO_POOL_WEIGHT : pool.weight)),
);

// Weighted draw over NAME_POOLS. Every name roller goes through here. Always
// exactly one random() draw, whatever the weighting.
function pickPool(by: PoolWeighting, roll: () => number = random): NamePool {
  let r = roll() * by.total;
  for (let i = 0; i < NAME_POOLS.length; i++) {
    r -= by.weights[i];
    if (r < 0) return NAME_POOLS[i];
  }
  return NAME_POOLS[NAME_POOLS.length - 1];
}

// A bare surname for events that need a plausible donor/alumni name (see
// eventData.ts's 'naming-rights').
export function rollSurname(): string {
  return pick(pickPool(FACULTY_POOL_WEIGHTS).last);
}

// The dedupe both name rollers share. From the pair the dice chose, walks
// forward (next surname, then next first name) until `format` of the pair
// is free. Takes no dice, so a collision can change a name but never the
// seeded stream, and pool size can't move a run either. If every pair is
// taken the repeat is accepted.
function stepToFree(
  firsts: readonly string[],
  lasts: readonly string[],
  firstAt: number,
  lastAt: number,
  existingNames: ReadonlySet<string>,
  format: (first: string, last: string) => string,
): string {
  const combos = firsts.length * lasts.length;
  for (let step = 0; step < combos; step++) {
    const at = lastAt + step;
    const full = format(firsts[(firstAt + Math.floor(at / lasts.length)) % firsts.length], lasts[at % lasts.length]);
    if (!existingNames.has(full)) return full;
  }
  return format(firsts[firstAt], lasts[lastAt]);
}

// A full "First Last" name with no "Dr." prefix, for a coach, a coach
// candidate or the athletic director (see studentLifeData.ts's
// generateCoachCandidate). Deduped against coachNamesInUse via stepToFree,
// so the draw count never depends on name clashes.
//
// Takes the team's gender rather than rolling one. Returns the origin,
// which Coach stores as `heritage` for FacultyPortrait.tsx's skin tone.
// `roll` is the coach market's local generator (see studentLifeData.ts's
// tickCoachCandidatePool), so the market's size can't move the global
// stream; defaults to random() for event-time callers.
export function rollCoachName(gender: 'male' | 'female', existingNames: ReadonlySet<string>, roll: () => number = random): RolledName {
  const firstPool = pickPool(COACH_POOL_WEIGHTS, roll);
  const lastPool = roll() < SAME_ORIGIN_NAME_WEIGHT ? firstPool : pickPool(COACH_POOL_WEIGHTS, roll);
  const firsts = firstNamesFor(firstPool, gender);
  const lasts = lastPool.last;
  const firstAt = Math.floor(roll() * firsts.length);
  const lastAt = Math.floor(roll() * lasts.length);
  return {
    name: stepToFree(firsts, lasts, firstAt, lastAt, existingNames, (first, last) => `${first} ${last}`),
    origin: firstPool.origin,
  };
}

interface RolledName {
  name: string;
  origin: string; // the first-name pool's origin — what nationality AND skin tone are tied to (see rollNationality/FacultyPortrait.tsx)
}

// `gender` is rolled by the caller first, because the first name must come
// from the matching list. Deduped by stepping (see stepToFree): four draws
// always, five when the surname comes from a second pool.
function rollFullName(existingNames: ReadonlySet<string>, gender: 'male' | 'female'): RolledName {
  const firstPool = pickPool(FACULTY_POOL_WEIGHTS);
  const lastPool = random() < SAME_ORIGIN_NAME_WEIGHT ? firstPool : pickPool(FACULTY_POOL_WEIGHTS);
  const firsts = firstNamesFor(firstPool, gender);
  const firstAt = Math.floor(random() * firsts.length);
  const lastAt = Math.floor(random() * lastPool.last.length);
  return {
    name: stepToFree(firsts, lastPool.last, firstAt, lastAt, existingNames, (first, last) => `Dr. ${first} ${last}`),
    origin: firstPool.origin,
  };
}

// ---------------------------------------------------------------------
// Nationality, shown in a faculty member's expanded row (FacultyTab.tsx).
// `flag` is authored data but not rendered (the glyphs failed in some
// browsers). Mostly American; otherwise tied to the name's origin pool.
// ---------------------------------------------------------------------
const AMERICAN_NATIONALITY_CHANCE = 0.72;
const AMERICAN_NATIONALITY = { nationality: 'United States', flag: '🇺🇸' };

// Non-American nationalities by origin pool. Chinese, Korean and Japanese
// each map to one country so a name never gets a wrong neighbouring
// nationality.
export const ORIGIN_NATIONALITIES: Record<string, Array<{ nationality: string; flag: string }>> = {
  'Chinese': [
    { nationality: 'China', flag: '🇨🇳' },
  ],
  'Korean': [
    { nationality: 'South Korea', flag: '🇰🇷' },
  ],
  'Japanese': [
    { nationality: 'Japan', flag: '🇯🇵' },
  ],
  'South Asian': [
    { nationality: 'India', flag: '🇮🇳' },
    { nationality: 'Bangladesh', flag: '🇧🇩' },
  ],
  'Anglo/Western European': [
    { nationality: 'United Kingdom', flag: '🇬🇧' },
    { nationality: 'Ireland', flag: '🇮🇪' },
    { nationality: 'Germany', flag: '🇩🇪' },
    { nationality: 'Canada', flag: '🇨🇦' },
  ],
  'Hispanic/Latin American': [
    { nationality: 'Mexico', flag: '🇲🇽' },
    { nationality: 'Spain', flag: '🇪🇸' },
    { nationality: 'Colombia', flag: '🇨🇴' },
    { nationality: 'Argentina', flag: '🇦🇷' },
  ],
  'Arabic/Middle Eastern': [
    { nationality: 'Egypt', flag: '🇪🇬' },
    { nationality: 'Lebanon', flag: '🇱🇧' },
    { nationality: 'Jordan', flag: '🇯🇴' },
  ],
  'Slavic/Eastern European': [
    { nationality: 'Poland', flag: '🇵🇱' },
    { nationality: 'Russia', flag: '🇷🇺' },
    { nationality: 'Serbia', flag: '🇷🇸' },
    { nationality: 'Czechia', flag: '🇨🇿' },
  ],
  'West African': [
    { nationality: 'Nigeria', flag: '🇳🇬' },
    { nationality: 'Ghana', flag: '🇬🇭' },
    { nationality: 'Senegal', flag: '🇸🇳' },
  ],
  'East African': [
    { nationality: 'Kenya', flag: '🇰🇪' },
    { nationality: 'Tanzania', flag: '🇹🇿' },
    { nationality: 'Uganda', flag: '🇺🇬' },
  ],
};

function rollNationality(origin: string): { nationality: string; flag: string } {
  if (random() < AMERICAN_NATIONALITY_CHANCE) return AMERICAN_NATIONALITY;
  return pick(ORIGIN_NATIONALITIES[origin] ?? [AMERICAN_NATIONALITY]);
}

// A flat coin flip, independent of the name pool.
function rollGender(): 'male' | 'female' {
  return random() < 0.5 ? 'male' : 'female';
}

// ---------------------------------------------------------------------
// Biography: a one-line flavor sentence shown when a roster row is expanded
// (FacultyTab.tsx). No gendered pronouns.
// ---------------------------------------------------------------------
const BIO_INSTITUTIONS = [
  'Ashcombe University', 'Kestrel Bay Institute of Technology', 'University of Calderwood',
  'Marchmont University', 'Ravensmoor Institute', 'Ironwood University', 'Sable Ridge College',
  'Amberfield University', 'a small liberal-arts college', 'a large state university',
];

const FIELD_RESEARCH_INTERESTS: Record<string, string[]> = {
  English: ['postcolonial literature', 'rhetoric and composition', 'digital humanities'],
  History: ['20th-century political movements', 'maritime trade networks', 'oral history methods'],
  Philosophy: ['ethics and moral philosophy', 'philosophy of mind', 'political philosophy'],
  Communication: ['media effects research', 'documentary practice', 'political communication'],
  'Art & Design': ['visual culture', 'typographic history', 'studio practice'],
  Music: ['music cognition', 'ethnomusicology', 'composition for ensembles'],
  Economics: ['labor markets', 'behavioral economics', 'monetary policy'],
  'Political Science': ['comparative democratization', 'constitutional law', 'international security'],
  Psychology: ['cognitive development', 'clinical resilience', 'decision-making under uncertainty'],
  Sociology: ['urban inequality', 'social network analysis', 'the sociology of work'],
  Mathematics: ['combinatorics', 'applied topology', 'statistical learning theory'],
  Physics: ['condensed matter theory', 'orbital mechanics', 'astrophysical modeling'],
  Chemistry: ['catalysis', 'polymer synthesis', 'medicinal chemistry'],
  Biology: ['cell signaling pathways', 'conservation ecology', 'evolutionary genetics'],
  'Public Health': ['infectious disease epidemiology', 'nutrition policy', 'health disparities'],
  'Clinical Health': ['patient safety outcomes', 'geriatric care models', 'pharmacotherapy and adherence'],
  Neuroscience: ['synaptic plasticity', 'neural circuits of decision-making', 'neurodegenerative disease models'],
  Kinesiology: ['exercise metabolism', 'gait and movement biomechanics', 'rehabilitation science'],
  'Computer Science': ['distributed systems', 'programming language design', 'human-computer interaction'],
  'Artificial Intelligence': ['deep learning architectures', 'computer vision', 'the ethics of automated decisions'],
  'Information Systems': ['applied cryptography', 'enterprise data governance', 'security operations'],
  'Mechanical Engineering': ['thermofluid systems', 'materials fatigue', 'robotic actuation'],
  'Electrical Engineering': ['power electronics', 'wireless signal processing', 'integrated circuit design'],
  'Civil Engineering': ['structural resilience', 'geotechnical modeling', 'transportation networks'],
  'Operations Research': ['stochastic optimization', 'supply chain modeling', 'queueing theory'],
  'Accounting & Finance': ['asset pricing', 'audit quality', 'corporate disclosure'],
  Marketing: ['consumer choice', 'brand equity', 'digital attribution'],
  Management: ['corporate strategy', 'entrepreneurship', 'organizational behavior'],
};

function rollBio(field: string): string {
  const institution = pick(BIO_INSTITUTIONS);
  const interests = FIELD_RESEARCH_INTERESTS[field] ?? ['the field'];
  const interest = pick(interests);
  return `Earned a doctorate in ${field} at ${institution}; research centers on ${interest}.`;
}

// ---------------------------------------------------------------------
// Faculty appreciate: teaching/research start below a rolled potential and
// rise toward it with tenure, and salary climbs on its own slower curve, so
// a long-retained star costs much more than the day they were hired. Both
// are exponential approaches to a ceiling, parameterised by "years to near
// plateau". facultySystem.ts's weekly tick applies them; generateCandidate
// uses them at tenure 0.
// ---------------------------------------------------------------------
const FACULTY_POTENTIAL_MIN = 45;
const FACULTY_POTENTIAL_RANGE = 55; // potential (the ceiling) rolls in [45, 100]

const FACULTY_STARTING_POTENTIAL_FRACTION = 0.55; // a fresh hire arrives at this fraction of their eventual ceiling
const FACULTY_GROWTH_PLATEAU_YEARS = 6;            // tenure (years) to close FACULTY_GROWTH_PLATEAU_FRACTION of the start->potential gap
const FACULTY_GROWTH_PLATEAU_FRACTION = 0.95;
const FACULTY_GROWTH_RATE_PER_WEEK =
  1 - (1 - FACULTY_GROWTH_PLATEAU_FRACTION) ** (1 / (FACULTY_GROWTH_PLATEAU_YEARS * WEEKS_PER_YEAR));

// How long the five founding professors are taken to have been teaching
// when the university opens (see actions.ts's roster). Stats are derived
// from potential plus tenure every tick, so tenure is the only way to make
// them established. 78 weeks puts their mean teaching at 66 (Associate on
// QUALITY_TIER_THRESHOLDS). The +38% founding payroll that comes with it
// is intended; raising it further is what the low-tuition discount build
// can't carry.
export const FOUNDING_TENURE_WEEKS = 78;

export function grownStat(potential: number, tenureWeeks: number): number {
  const start = potential * FACULTY_STARTING_POTENTIAL_FRACTION;
  const grownFraction = 1 - (1 - FACULTY_GROWTH_RATE_PER_WEEK) ** tenureWeeks;
  return Math.round(start + (potential - start) * grownFraction);
}

// --- Salary curve. Payroll compounds without anyone clicking anything:
// faculty are the growth loop's most front-loaded cost, paid years before
// the curriculum they unlock earns prestige. See financeSystem.ts's
// cost-driver block.
const SALARY_BASE = 45_000;
const SALARY_PER_SKILL_POINT = 320;      // applied to *current* (grown) stats, so a maturing hire gets more expensive on both curves at once
const SALARY_TENURE_PREMIUM_MAX = 0.5;   // seniority premium on top of the skill-linked base, at full maturity: up to +50%
const SALARY_GROWTH_PLATEAU_YEARS = 10;  // salary keeps climbing after skill plateaus — raises continue for seniority alone
const SALARY_GROWTH_PLATEAU_FRACTION = 0.95;
const SALARY_GROWTH_RATE_PER_WEEK =
  1 - (1 - SALARY_GROWTH_PLATEAU_FRACTION) ** (1 / (SALARY_GROWTH_PLATEAU_YEARS * WEEKS_PER_YEAR));
// What one research prize (see researchData.ts) permanently adds to its
// winner's salary. Kept with the salary curve so one file explains what a
// hire costs.
export const ACCLAIM_SALARY_PREMIUM = 0.35;

// Current annual salary: a skill-linked base on current stats, a seniority
// premium on its own slower curve, and a flat premium per research prize.
// `acclaim` is a parameter rather than written into `salary` because this
// is recomputed every week. Defaults to 0 (candidates and new hires).
//
// Market rate: what a school pays is salary times a multiplier from its
// prestige (1.0 at 50, rising linearly, capped). Applied at the payroll
// (financeSystem.ts's facultyPay), never written into `salary`.
const MARKET_RATE_AT_PRESTIGE_50 = 1.0;
const MARKET_RATE_AT_PRESTIGE_130 = 3.4;
const MARKET_RATE_CAP = 4.0;
export function marketRateMultiplier(prestige: number): number {
  const slope = (MARKET_RATE_AT_PRESTIGE_130 - MARKET_RATE_AT_PRESTIGE_50) / (130 - 50);
  return Math.max(MARKET_RATE_AT_PRESTIGE_50, Math.min(MARKET_RATE_CAP, MARKET_RATE_AT_PRESTIGE_50 + (prestige - 50) * slope));
}

export function facultySalary(teaching: number, research: number, tenureWeeks: number, acclaim = 0): number {
  const skillBase = SALARY_BASE + (teaching + research) * SALARY_PER_SKILL_POINT;
  const tenurePremium = 1 - (1 - SALARY_GROWTH_RATE_PER_WEEK) ** tenureWeeks;
  return Math.round(
    skillBase * (1 + SALARY_TENURE_PREMIUM_MAX * tenurePremium) * (1 + ACCLAIM_SALARY_PREMIUM * acclaim),
  );
}

// ---------------------------------------------------------------------
// Course slots: how many `requiresFaculty`-gated courses in `field` this
// hire can staff at once (see techSystem.ts's usedFacultySlots/
// totalFacultySlots). Rolled at hire, then growFaculty adds one every
// SLOT_GROWTH_INTERVAL_WEEKS of tenure.
//
// 4-6 base slots keeps early payroll heavy but survivable (at 2-4 a
// founding school needed about one professor per course and couldn't save
// for a dorm). Slots are occupied forever, so a full catalogue still needs
// a roster in the dozens.
// ---------------------------------------------------------------------
const FACULTY_BASE_SLOTS_MIN = 4;
const FACULTY_BASE_SLOTS_RANGE = 2; // rolls 4..6 course slots at hire
export const SLOT_GROWTH_INTERVAL_WEEKS = 104; // +1 slot every 2 years of tenure retained
export const MAX_FACULTY_SLOTS = 10;

function rollBaseCourseSlots(): number {
  return FACULTY_BASE_SLOTS_MIN + Math.floor(random() * (FACULTY_BASE_SLOTS_RANGE + 1));
}

// A display-only academic-rank ladder over (teaching+research)/2, so "hire
// better" reads as a separate lever from "hire more".
export type FacultyQualityTier = 'Adjunct' | 'Assistant' | 'Associate' | 'Full' | 'Distinguished';
const QUALITY_TIER_THRESHOLDS: Array<[number, FacultyQualityTier]> = [
  [85, 'Distinguished'],
  [70, 'Full'],
  [55, 'Associate'],
  [35, 'Assistant'],
  [0, 'Adjunct'],
];
export function facultyQualityTier(f: Faculty): FacultyQualityTier {
  const avg = (f.teaching + f.research) / 2;
  for (const [min, tier] of QUALITY_TIER_THRESHOLDS) {
    if (avg >= min) return tier;
  }
  return 'Adjunct';
}

// ---------------------------------------------------------------------
// Hiring: a standing, churning candidate market. The player appoints
// straight off `s.candidates` (HIRE_FACULTY); facultySystem.ts's
// tickCandidatePool ages listings, withdraws stale ones and tops the pool
// back up. Common fields are almost always available; thin-market
// specialists show up intermittently.
// ---------------------------------------------------------------------

// --- Churn tuning; read these together:
//
//   pool size  ~= CANDIDATE_POOL_TARGET
//   turnover   ~= CANDIDATE_POOL_TARGET / CANDIDATE_LISTING_WEEKS per week
//   a field's share of the pool = its listing weight / the total (below)
//
// A field's chance of being listed in a given week is ~1 - e^-(30 x share):
// big fields (6-7%) ~85-88% of weeks, mid fields (3-4%) ~60-70%, thin
// markets (1-2%) ~28-48%. CANDIDATE_POOL_TARGET is the fastest single dial.
export const CANDIDATE_POOL_TARGET = 30;   // how many listings the market holds
export const CANDIDATE_LISTING_WEEKS = 12; // weeks an unhired listing stays up before it withdraws
const CANDIDATE_ARRIVALS_PER_WEEK_MAX = 4; // ceiling on new listings per week, so a hiring spree refills over a few weeks rather than instantly

// How thin the academic market is in a field, as a multiplier on its
// curriculum demand. 1.0 = ordinary; below 1 = scarce. Demand alone spreads
// fields only ~2x, so this is what makes a niche genuinely rare. Every field
// gets an explicit entry, even an ordinary one, so an unconsidered field
// looks different from a deliberate 1.0.
const DEFAULT_MARKET_SUPPLY = 1;
const FIELD_MARKET_SUPPLY: Record<string, number> = {
  'Clinical Health': 0.35,          // nursing and pharmacy faculty are the thinnest academic market there is: clinical practice pays far more than teaching it
  'Artificial Intelligence': 0.35,  // industry outbids universities for everyone qualified
  Neuroscience: 0.4,                // the doctorates exist, but medical centers and biotech take almost all of them before a teaching department gets a look
  'Accounting & Finance': 0.5,      // the perennial accounting-PhD shortage — the doctorate is long and the profession pays
  'Mechanical Engineering': 0.7,
  'Electrical Engineering': 0.7,
  'Civil Engineering': 0.7,
  'Operations Research': 0.7,       // small doctoral pipelines, and industry analytics competes for it
  Economics: 0.85,
  'Public Health': 0.9,
  'Information Systems': 0.9,
  Kinesiology: 1,                   // deliberately ordinary: exercise-science doctorates are plentiful relative to the number of lines, so this is the easy end of the Health Science roster and the counterweight to Clinical Health's 0.35
  // Law: plentiful supply, almost no demand (only law-school courses), so
  // above 1 to keep it findable. 1.5 keeps it ~2% of the pool; larger values
  // crowd out usable listings for the decades before a law school exists.
  Law: 1.5,
};

// A field's listing weight = courses in the curriculum that need it x its
// market supply. Demand is read off the curriculum so it can't drift from
// techData.ts. Memoized: the curriculum is a fixed seed.
let listingWeights: Array<{ field: string; weight: number }> | null = null;
let listingWeightTotal = 0;

function candidateListingWeights(): Array<{ field: string; weight: number }> {
  if (!listingWeights) {
    const courseCounts = new Map<string, number>();
    for (const node of initialTech()) {
      if (!node.requiresFaculty) continue;
      courseCounts.set(node.requiresFaculty, (courseCounts.get(node.requiresFaculty) ?? 0) + 1);
    }
    listingWeights = FACULTY_FIELDS
      .map((field) => ({
        field,
        weight: (courseCounts.get(field) ?? 0) * (FIELD_MARKET_SUPPLY[field] ?? DEFAULT_MARKET_SUPPLY),
      }))
      // A field no course asks for is never listed.
      .filter((entry) => entry.weight > 0);
    listingWeightTotal = listingWeights.reduce((sum, entry) => sum + entry.weight, 0);
  }
  return listingWeights;
}

// The field a new listing turns up in: a weighted draw.
export function rollCandidateField(): string {
  const weights = candidateListingWeights();
  let roll = random() * listingWeightTotal;
  for (const entry of weights) {
    roll -= entry.weight;
    if (roll <= 0) return entry.field;
  }
  return weights[weights.length - 1].field;
}

// One freshly rolled candidate in the given field. Pass the names already in
// play so the new name can't collide.
export function generateCandidate(field: string, existingNames: Iterable<string> = []): Faculty {
  const used = new Set(existingNames);
  const rolledTeaching = FACULTY_POTENTIAL_MIN + Math.round(random() * FACULTY_POTENTIAL_RANGE);
  const rolledResearch = FACULTY_POTENTIAL_MIN + Math.round(random() * FACULTY_POTENTIAL_RANGE);
  const gender = rollGender();
  const { name, origin } = rollFullName(used, gender);
  const { nationality, flag } = rollNationality(origin);
  // The id is drawn where it always was, so the stream is untouched; the
  // quirk it picks (data/quirkData.ts) then moves the rolled potentials.
  const id = newId();
  const quirk = quirkForId(id);
  const teachingPotential = clampPotential(rolledTeaching + (quirk?.effects.teaching ?? 0));
  const researchPotential = clampPotential(rolledResearch + (quirk?.effects.research ?? 0));
  const teaching = grownStat(teachingPotential, 0);
  const research = grownStat(researchPotential, 0);
  return {
    id,
    name,
    field,
    teaching,
    research,
    teachingPotential,
    researchPotential,
    tenureWeeks: 0,
    weeksListed: 0,
    salary: Math.round(facultySalary(teaching, research, 0) * (quirk?.effects.salary ?? 1)),
    courseSlots: rollBaseCourseSlots(),
    // Nobody arrives decorated: prizes are won here.
    acclaim: 0,
    nationality,
    flag,
    heritage: origin,
    gender,
    bio: rollBio(field),
    ...(quirk ? { quirk: quirk.id } : {}),
  };
}

function clampPotential(v: number): number {
  return Math.max(0, Math.min(100, v));
}

// The market the week the university is founded: a full pool. weeksListed
// is staggered so the pool doesn't age out in one synchronised wave.
export function initialCandidatePool(): Faculty[] {
  const pool: Faculty[] = [];
  const names: string[] = [];
  for (let i = 0; i < CANDIDATE_POOL_TARGET; i += 1) {
    const candidate = generateCandidate(rollCandidateField(), names);
    candidate.weeksListed = Math.floor(random() * CANDIDATE_LISTING_WEEKS);
    pool.push(candidate);
    names.push(candidate.name);
  }
  return pool;
}

// How many new listings to add this week: enough to close the gap to
// target, capped so a big hiring week refills gradually.
export function candidateArrivalsThisWeek(poolSize: number): number {
  return Math.max(0, Math.min(CANDIDATE_POOL_TARGET - poolSize, CANDIDATE_ARRIVALS_PER_WEEK_MAX));
}
