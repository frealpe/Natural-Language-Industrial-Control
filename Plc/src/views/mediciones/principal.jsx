import { useContext } from 'react';
import { CTabs, CTabList, CTab, CTabContent, CTabPanel } from '@coreui/react-pro';
import { Control } from '../../components/control/Control';
// import { Petri,PetriProvider } from '../../components/petri/index';
import PetriGui from '../../components/petri/gui/PetriGui';
import HolonGui from '../../components/holon/HolonGui';
import { MqttProvider } from '../../context/MqttContext';

const Principal = () => {

  return (
    <div className="p-1">


      {/* Contenedor con pestañas */}
      <CTabs activeItemKey="Mediciones">
        <CTabList variant="underline-border">
          <CTab itemKey="Mediciones">Mediciones</CTab>
          <CTab itemKey="Petri">Petri</CTab>
          <CTab itemKey="Holon">Holones</CTab>
          {/* <CTab itemKey="Configuracion">Configuración</CTab> */}
        </CTabList>

        <CTabContent>
          <CTabPanel itemKey="Mediciones">
            <div style={{ maxHeight: '80vh', overflowY: 'auto', overflowX: 'hidden' }}>
              <Control />
            </div>
          </CTabPanel>
          <CTabPanel itemKey="Petri">
            {/* <PetriProvider> */}
            {/* <Petri/> */}
            <PetriGui />
            {/* </PetriProvider> */}

          </CTabPanel>
          <CTabPanel itemKey="Holon">
            <MqttProvider>
              <HolonGui />
            </MqttProvider>

          </CTabPanel>

        </CTabContent>
      </CTabs>
    </div>
  );
};

export default Principal;
