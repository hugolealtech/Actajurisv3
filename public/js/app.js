function mascaraTelefone(el){let v=el.value.replace(/\D/g,'');v=v.replace(/^(\d{2})(\d)/,'($1) $2');v=v.replace(/(\d)(\d{4})$/,'$1-$2');el.value=v}
function mascaraCPFCNPJ(el){let v=el.value.replace(/\D/g,'');if(v.length<=11){v=v.replace(/(\d{3})(\d)/,'$1.$2');v=v.replace(/(\d{3})(\d)/,'$1.$2');v=v.replace(/(\d{3})(\d{1,2})$/,'$1-$2')}else{if(v.length>14)v=v.slice(0,14);v=v.replace(/^(\d{2})(\d)/,'$1.$2');v=v.replace(/^(\d{2})\.(\d{3})(\d)/,'$1.$2.$3');v=v.replace(/\.(\d{3})(\d)/,'.$1/$2');v=v.replace(/(\d{4})(\d)/,'$1-$2')}el.value=v}
function mascaraCEP(el){let v=el.value.replace(/\D/g,'').slice(0,8);v=v.replace(/^(\d{5})(\d)/,'$1-$2');el.value=v;if(v.length===9)buscarCEP(v)}
function mascaraNumProc(el){let v=el.value.replace(/\D/g,'').slice(0,20);v=v.replace(/^(\d{7})(\d)/,'$1-$2');v=v.replace(/-(\d{2})(\d)/,'-$1.$2');v=v.replace(/\.(\d{4})(\d)/,'.$1.$2');v=v.replace(/\.(\d{4})\.(\d{1})(\d)/,'.$1.$2.$3');v=v.replace(/\.(\d{1})\.(\d{2})(\d)/,'.$1.$2.$3');el.value=v}

async function buscarCEP(cep){
  const c=cep.replace(/\D/g,'');if(c.length!==8)return;
  const s=document.getElementById('cep_status');
  const r=document.getElementById('campo_rua')||document.querySelector('[name="endereco_rua"]');
  if(s){s.style.display='block';s.innerHTML='<i class="fas fa-spinner fa-spin"></i> Consultando...';s.className='text-sm text-gold mt-2'}
  try{
    const res=await fetch(`https://viacep.com.br/ws/${c}/json/`);const d=await res.json();
    if(d.erro){if(s){s.innerHTML='<i class="fas fa-times-circle"></i> CEP não encontrado.';s.className='text-sm text-red mt-2'}}
    else{if(s){s.innerHTML='<i class="fas fa-check-circle"></i> Endereço localizado!';s.className='text-sm text-green mt-2'}
      if(r){r.value=`${d.logradouro}, ${d.bairro}, ${d.localidade}/${d.uf}`;const comp=document.querySelector('[name="endereco_complemento"]');if(comp)comp.focus()}}
  }catch(e){if(s){s.innerHTML='<i class="fas fa-exclamation-triangle"></i> Erro de conexão.';s.className='text-sm text-red mt-2'}}
}

const REUS={
  inss: {nome:'INSTITUTO NACIONAL DO SEGURO SOCIAL - INSS',cnpj:'29.979.036/0001-40',rep:'representada pela Procuradoria Federal',end:'Setor de Autarquias Sul, Quadra 2, Bloco O, Brasília/DF, CEP 70070-946'},
  uniao:{nome:'UNIÃO FEDERAL',cnpj:'00.394.411/0001-09',rep:'representada pela Procuradoria-Geral da União',end:'Esplanada dos Ministérios, Bloco P, Brasília/DF, CEP 70067-900'},
  cef:  {nome:'CAIXA ECONÔMICA FEDERAL',cnpj:'00.360.305/0001-04',rep:'representada por seu corpo jurídico',end:'Setor Bancário Sul, Quadra 4, Lotes 3/4, Brasília/DF, CEP 70092-900'},
};
function pReu(k){const r=REUS[k];if(!r)return;document.getElementById('nome_reu').value=r.nome;document.getElementById('cnpj_reu').value=r.cnpj;const rp=document.getElementById('representante_reu');const en=document.getElementById('endereco_reu');if(rp)rp.value=r.rep;if(en)en.value=r.end}

document.addEventListener('DOMContentLoaded',()=>{
  const p=new URLSearchParams(window.location.search);
  if(p.get('status')==='sucesso'&&window.Swal){
    Swal.fire({title:'Salvo!',text:'Dados gravados com sucesso.',icon:'success',toast:true,position:'top-end',showConfirmButton:false,timer:3000,timerProgressBar:true});
    window.history.replaceState({},'',window.location.pathname+window.location.hash);
  }
  
  // Handle fase_processual changes for conditional display
  const faseSelect = document.querySelector('[name="fase_processual"]');
  const updateFaseDisplay = () => {
    const fase = faseSelect?.value || 'administrativa';
    const isjudicial = ['judicial_1grau', 'recursal', 'execucao'].includes(fase);
    const isadmin = fase === 'administrativa';
    
    // Show/hide sections
    const camposJudicial = document.getElementById('campos-judicial');
    const camposAdmin = document.getElementById('campos-admin');
    const previewJudicial = document.getElementById('preview-judicial');
    const previewAdmin = document.getElementById('preview-admin');
    const previewSection = document.getElementById('preview-section');
    const previewHint = document.getElementById('preview-hint');
    
    if (camposJudicial) camposJudicial.style.display = isjudicial ? 'block' : 'none';
    if (camposAdmin) camposAdmin.style.display = isadmin ? 'block' : 'none';
    if (previewSection) previewSection.style.display = (isjudicial || isadmin) ? 'block' : 'none';
    if (previewJudicial) previewJudicial.style.display = isjudicial ? 'block' : 'none';
    if (previewAdmin) previewAdmin.style.display = isadmin ? 'block' : 'none';
    
    if (previewHint) {
      if (isjudicial) {
        previewHint.innerHTML = 'Cole no Word: <code>AO JUÍZO DA {vara} {jurisdicao} {circunscricao_judiciaria}</code>';
      } else if (isadmin) {
        previewHint.innerHTML = 'Cole no Word: <code>AO INSTITUTO NACIONAL DO SEGURO SOCIAL - INSS</code><br/>Tese: <code>{tese_administrativa}</code>';
      }
    }
  };
  
  if (faseSelect) {
    updateFaseDisplay();
    faseSelect.addEventListener('change', updateFaseDisplay);
  }
  
  // Update tese_administrativa preview
  const teseAdminInput = document.getElementById('tese_administrativa');
  const previewAdmin = document.getElementById('pa');
  if (teseAdminInput && previewAdmin) {
    teseAdminInput.addEventListener('input', (e) => {
      previewAdmin.textContent = e.target.value || '_______________';
    });
  }
  
  const vEl=document.getElementById('vara'),jEl=document.getElementById('jurisdicao'),cEl=document.getElementById('circunscricao');
  const pv=document.getElementById('pv'),pj=document.getElementById('pj'),pc=document.getElementById('pc');
  if(vEl&&pv){vEl.addEventListener('input',e=>{pv.textContent=e.target.value||'___'});vEl.addEventListener('blur',e=>{if(/^\d+$/.test(e.target.value.trim())){e.target.value=e.target.value.trim()+'ª';pv.textContent=e.target.value}})}
  if(jEl&&pj)jEl.addEventListener('change',e=>{pj.textContent=e.target.value||'_______'});
  if(cEl&&pc)cEl.addEventListener('input',e=>{pc.textContent=e.target.value||'_______'});
  const tRep=document.getElementById('tRep'),bRep=document.getElementById('bRep');
  if(tRep&&bRep)tRep.addEventListener('change',()=>bRep.classList.toggle('d-none',!tRep.checked));
  const ctx=document.getElementById('chartTipos');
  if(ctx&&window.Chart&&window.__chartData){
    const labels=window.__chartData.map(d=>d._id||'Não definido');
    const values=window.__chartData.map(d=>d.count);
    const cores=['#c9a84c','#2563eb','#16a34a','#dc2626','#7c3aed','#ea580c','#0891b2','#db2777'];
    new Chart(ctx,{type:'doughnut',data:{labels,datasets:[{data:values,backgroundColor:cores,borderWidth:2,borderColor:'#fff'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'right',labels:{font:{family:'DM Sans',size:11},boxWidth:12,padding:10}}}}});
  }
  // Confirm before archiving/unarchiving
  document.querySelectorAll('form[action*="/arquivar"]').forEach(f=>{
    f.addEventListener('submit',e=>{
      const title = f.querySelector('button')?.getAttribute('title') || 'Arquivar/Desarquivar';
      if(!confirm(`${title}?`)) e.preventDefault();
    });
  });
});
