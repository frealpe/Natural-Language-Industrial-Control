import React from 'react'
import { CFooter } from '@coreui/react-pro'

const AppFooter = () => {
  return (
    <CFooter className="px-4">
      <div>
        <a href="https://www.unicauca.edu.co/" target="_blank" rel="noopener noreferrer">
          Unicauca
        </a>
        <span className="ms-1">&copy; {new Date().getFullYear()}</span>
      </div>
      <div className="ms-auto">
        <span className="me-1">Automática Industrial</span>
        <a
          href="https://fiet.unicauca.edu.co/deic/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Departamento de Electrónica, Instrumentación y Control
        </a>
      </div>
    </CFooter>
  )
}

export default React.memo(AppFooter)
