import React, { useEffect, useState } from 'react'

interface Law {
  L_Act_id: number
  L_Act_date: string
  L_ActL_title: string
}

const API_LAWS = 'http://localhost:3001/api/laws'

const LawsList: React.FC = () => {
  const [laws, setLaws] = useState<Law[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(API_LAWS)
      .then((res) => {
        if (!res.ok) throw new Error('Грешка при зареждане на данните')
        return res.json()
      })
      .then((data) => {
        if (data && Array.isArray(data.laws)) {
          setLaws(
            data.laws.map((b: any) => ({
              L_Act_id: b.L_Act_id || b.id,
              L_Act_date: b.L_Act_date || b.submitted_date,
              L_ActL_title: b.L_ActL_title || b.L_Act_title || b.title,
            }))
          )
        } else {
          setError('Невалиден формат на отговора от API.')
          setLaws([])
        }
        setLoading(false)
      })
      .catch(() => {
        setError('Грешка при зареждане на данните от proxy API.')
        setLaws([])
        setLoading(false)
      })
  }, [])

  return (
    <div>
      <h2>Списък със закони</h2>
      {loading && <div>Зареждане...</div>}
      {error && <div style={{ color: 'orange' }}>Внимание: {error}</div>}
      {!loading && laws.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Заглавие</th>
              <th>Дата</th>
            </tr>
          </thead>
          <tbody>
            {laws.map((law) => (
              <tr key={law.L_Act_id}>
                <td>{law.L_ActL_title}</td>
                <td>{law.L_Act_date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!loading && laws.length === 0 && <div>Няма намерени закони.</div>}
    </div>
  )
}

export default LawsList
