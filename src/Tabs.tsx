import React, { useState } from 'react'
import PoliticiansList from './PoliticiansList'
import LawsList from './LawsList'
import LawsListByYear from './LawsListByYear'
import LawsListGrouped from './LawsListGrouped'

const Tabs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'deputati' | 'zakoni' | 'zakoniByYear' | 'partii' | 'zakoniGrouped'
  >('deputati')

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          onClick={() => setActiveTab('deputati')}
          style={{ fontWeight: activeTab === 'deputati' ? 'bold' : 'normal' }}
        >
          Депутати
        </button>
        <button
          onClick={() => setActiveTab('zakoni')}
          style={{ fontWeight: activeTab === 'zakoni' ? 'bold' : 'normal' }}
        >
          Закони
        </button>
        <button
          onClick={() => setActiveTab('partii')}
          style={{ fontWeight: activeTab === 'partii' ? 'bold' : 'normal' }}
        >
          Партии
        </button>
        <button
          onClick={() => setActiveTab('zakoniByYear')}
          style={{
            fontWeight: activeTab === 'zakoniByYear' ? 'bold' : 'normal',
          }}
        >
          Закони по години
        </button>
        <button
          onClick={() => setActiveTab('zakoniGrouped')}
          style={{
            fontWeight: activeTab === 'zakoniGrouped' ? 'bold' : 'normal',
          }}
        >
          Основни закони и изменения
        </button>
      </div>
      <div>
        {activeTab === 'deputati' && <PoliticiansList />}
        {activeTab === 'zakoni' && <LawsList />}
        {activeTab === 'zakoniByYear' && <LawsListByYear />}
        {activeTab === 'zakoniGrouped' && <LawsListGrouped />}
        {activeTab === 'partii' && <div>Тук ще се показват партиите.</div>}
      </div>
    </div>
  )
}

export default Tabs
