import React, { useEffect, useState } from 'react'
import LawFullText from './LawFullText'

interface Law {
  title: string
  date: string
  link: string
}

interface GroupedLaw {
  main: Law
  amendments: Law[]
}

const LawsListGrouped: React.FC = () => {
  const [laws, setLaws] = useState<GroupedLaw[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedLawIdx, setSelectedLawIdx] = useState<number | null>(null)
  const [showFull, setShowFull] = useState<{ link: string } | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch('/grouped_laws.json')
      .then((res) => {
        if (!res.ok) throw new Error('Грешка при зареждане на данните')
        return res.json()
      })
      .then((data) => {
        if (Array.isArray(data)) setLaws(data)
        else setError('Невалиден формат на файла grouped_laws.json')
        setLoading(false)
      })
      .catch(() => {
        setError('Грешка при зареждане на grouped_laws.json')
        setLoading(false)
      })
  }, [])

  if (loading) return <div>Зареждане...</div>
  if (error) return <div style={{ color: 'orange' }}>Внимание: {error}</div>
  if (!laws.length) return <div>Няма намерени закони.</div>

  return (
    <div>
      <h2>Основни закони и изменения</h2>
      <ul>
        {laws.map((group, idx) => (
          <li key={group.main.link || idx} style={{ marginBottom: 16 }}>
            <a
              href={group.main.link}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontWeight: 'bold' }}
              onClick={(e) => {
                e.preventDefault()
                setShowFull({ link: group.main.link })
              }}
            >
              {group.main.title}
            </a>
            {selectedLawIdx === idx && (
              <div style={{ marginTop: 8, marginLeft: 16 }}>
                <div>Изменения и допълнения:</div>
                <ul>
                  {group.amendments.length === 0 && <li>Няма изменения.</li>}
                  {group.amendments.map((am, i) => (
                    <li key={am.link || i}>
                      <a
                        href={am.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => {
                          e.preventDefault()
                          setShowFull({ link: am.link })
                        }}
                      >
                        {am.title}
                      </a>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => setSelectedLawIdx(null)}
                  style={{ marginTop: 8 }}
                >
                  Затвори
                </button>
              </div>
            )}
            {showFull && showFull.link && (
              <LawFullText
                lawLink={showFull.link}
                onClose={() => setShowFull(null)}
              />
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default LawsListGrouped
