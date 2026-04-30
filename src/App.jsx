import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'
import Canvas from './components/Canvas'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div style={{overflow: "hidden", height: "100vh"}}>
        <Canvas />
    </div>
  )
}

export default App
