import { createClient } from '@/lib/supabase/server'
import { requireWorkspace } from '@/lib/workspace'

export default async function TasksPage() {
  const workspace = await requireWorkspace()
  const supabase = await createClient()
  const { data: tasks, error } = await supabase.from('tasks').select('id,title,status,priority,due_at').eq('workspace_id', workspace.id).order('due_at', { ascending: true })
  if (error) throw new Error(`Failed to load tasks: ${error.message}`)
  return <><div className="section-head"><div><div className="brand">EXECUTION</div><h1 style={{marginTop:8}}>Tarefas</h1></div></div><section className="card table-wrap"><table><thead><tr><th>Tarefa</th><th>Prioridade</th><th>Status</th><th>Prazo</th></tr></thead><tbody>{(tasks || []).map((task)=><tr key={task.id}><td>{task.title}</td><td><span className="badge">{task.priority}</span></td><td>{task.status}</td><td>{task.due_at ? new Date(task.due_at).toLocaleString('pt-BR') : '—'}</td></tr>)}</tbody></table></section></>
}
