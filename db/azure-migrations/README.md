# Migrations do banco (Azure)

Coloque aqui arquivos `.sql` numerados (ex.: `001_nova_tabela.sql`) para mudanças de
ESTRUTURA do banco. Ao dar merge na branch padrao, o workflow "DB migrations -> Azure"
aplica os arquivos novos automaticamente no backend Azure (api.xptoinc.com.br), em
transacao e idempotente. NAO use as ferramentas Supabase antigas para o banco do Azure.
