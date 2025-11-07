import { useState } from 'react'
import './App.css'
import RaceTracker from './RaceTracker'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <RaceTracker />
    </>
  )
}

export default App
