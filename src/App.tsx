import Read_excel from "./components/Read_excel";

const App = () => {
  return (
    <div>
      <Read_excel />
      
    </div>
  );
};

export default App;


// import React, { useEffect, useState } from 'react';
// import flagsData from './assets/flags.json';

// const App = () => {
//     const [flags, setFlags] = useState([]);

//     useEffect(() => {
//         setFlags(flagsData);
//     }, []);

//     return (
//         <div>
//             <h1>Flags of Countries</h1>
//             <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
//                 {flags.map((flag) => (
//                     <div key={flag.src}>
//                         <img src={flag.src} alt={flag.title} style={{ width: '300px', margin: '10px' }} />
//                         <p>{flag.title}</p>
//                     </div>
//                 ))}
//             </div>
//         </div>
//     );
// };

// export default App;
