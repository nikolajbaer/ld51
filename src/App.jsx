import { useEffect,useState } from 'react'
import './App.css'

function App() {
  const [counter,setCounter] = useState(0)
  const text=['Something','Happens','Every','10','Seconds']

  useEffect( () => {
    const interval = setInterval(()=>{
      setCounter((counter+1)%text.length)
    },2000)
    return () => clearInterval(interval)
  })

  return (
    <div className="App">
      <div className="title">
        <h1>Ludum Dare 51</h1>
        {<div className="pulse">{text[counter]}</div>}
      </div>
    </div>
  )
}

export default App
