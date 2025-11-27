import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

// Interfaces
interface ApiResponse<T = any> {
  items?: T[];
  itens?: T[];
}

@Injectable({ providedIn: 'root' })
export class ItensAprovarService {

  // Base do ICS
  private readonly baseUrl = 'https://institutoclima128987.protheus.cloudtotvs.com.br:4050/rest/iCS';
  private readonly postEndpoint = `${this.baseUrl}/PostGeneric`;

  constructor(private http: HttpClient) {}

  // -----------------------------------------------------------
  // 🔐 AUTENTICAÇÃO (SEM USUÁRIO FIXO)
  // -----------------------------------------------------------

  private getAuthHeader(contentType = false): HttpHeaders {
    let headers = new HttpHeaders();

    const token = localStorage.getItem('authToken'); // Base64(user:senha)

    if (!token) {
      console.error('❌ Nenhum token encontrado. Usuário não fez login.');
    } else {
      headers = headers.set('Authorization', `Basic ${token}`);
    }

    if (contentType) {
      headers = headers.set('Content-Type', 'application/json');
    }

    return headers;
  }

  private getUsuarioParaParam1(): string {
    return (localStorage.getItem('authUser') ?? '').trim();
  }

  private escapeArg(value: any): string {
    if (value === null || value === undefined) return '';
    return String(value).replace(/'/g, "\\'");
  }

  // -----------------------------------------------------------
  // 🔍 GET ITENS (COM HANDLER PARA JSON QUEBRADO DO PROTHEUS)
  // -----------------------------------------------------------

  async getItens(): Promise<any[]> {
    const headers = this.getAuthHeader();
    const usuario = encodeURIComponent(this.getUsuarioParaParam1());

    const url = `${this.baseUrl}/new_query_generic?busca='APROV'&param1=${usuario}`;

    try {
      const raw = await firstValueFrom(
        this.http.get(url, {
          headers,
          responseType: 'text' as const
        })
      );

      // 1) Remover caracteres inválidos
      let safe = raw
        .replace(/[^\x20-\x7EÀ-ÿ{}[\],:"0-9a-zA-Z.\s]/g, ' ')
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']');

      // 2) Ajustar colchetes cortados pelo Protheus
      const abrir = (safe.match(/\[/g) || []).length;
      const fechar = (safe.match(/]/g) || []).length;
      if (abrir > fechar) safe += ']';

      if (safe.trim().endsWith(',')) {
        safe = safe.trim().slice(0, -1);
      }

      // 3) Tentar parse normal
      try {
        const json = JSON.parse(safe);
        if (json && Array.isArray(json.itens)) {
          return json.itens;
        }
      } catch {
        console.warn('⚠️ Falha no parse direto, tentando extração manual.');
      }

      // 4) Extrair objetos manualmente
      const matches = safe.match(/{[^}]+}/g);
      if (matches) {
        return matches
          .map(m => {
            try { return JSON.parse(m); }
            catch { return null; }
          })
          .filter(x => x !== null) as any[];
      }

      console.error('❌ Não foi possível extrair itens.');
      return [];

    } catch (err) {
      console.error('❌ Erro geral no getItens:', err);
      return [];
    }
  }

  // -----------------------------------------------------------
  // ✔️ APROVAR ITENS
  // -----------------------------------------------------------

  async aprovarItensSelecionados(itens: Array<{ pedido: string; alias?: string }>): Promise<void> {
    if (!itens?.length) return;

    const headers = this.getAuthHeader(true);
    const usuario = this.getUsuarioParaParam1();

    const requests = itens.map(item => {
      const rotina = `u_icsac007({'sim','${this.escapeArg(item.pedido)}','${this.escapeArg(item.alias ?? '')}','${this.escapeArg(usuario)}',''})`;

      const payload = {
        autorizacao: [
          {
            acao: 'A',
            empresa: '01',
            filial: '01',
            tabela: 'XXX',
            rotina
          }
        ]
      };

      return firstValueFrom(this.http.post(this.postEndpoint, payload, { headers }));
    });

    const results = await Promise.allSettled(requests);
    const rejected = results.filter(r => r.status === 'rejected');

    if (rejected.length) {
      console.error('❌ Falha ao aprovar itens:', rejected);
      throw new Error('Falha ao aprovar alguns itens.');
    }
  }

  // -----------------------------------------------------------
  // ❌ REJEITAR ITEM
  // -----------------------------------------------------------

  async rejeitarItemService(item: { pedido: string; alias?: string }, motivo: string): Promise<void> {
    const headers = this.getAuthHeader(true);
    const usuario = this.getUsuarioParaParam1();

    const rotina = `u_icsac007({'nao','${this.escapeArg(item.pedido)}','${this.escapeArg(item.alias ?? '')}','${this.escapeArg(usuario)}','${this.escapeArg(motivo)}'})`;

    const payload = {
      autorizacao: [
        {
          acao: 'A',
          empresa: '01',
          filial: '01',
          tabela: 'XXX',
          rotina
        }
      ]
    };

    try {
      await firstValueFrom(this.http.post(this.postEndpoint, payload, { headers }));
    } catch (err) {
      console.error('❌ Erro ao rejeitar item:', err);
      throw err;
    }
  }

  // -----------------------------------------------------------
  // 🔎 DETALHES DO PEDIDO
  // -----------------------------------------------------------

  async getDetalhesPedido(pedido: string): Promise<any[]> {
    if (!pedido) return [];

    const headers = this.getAuthHeader();
    const url = `${this.baseUrl}/new_query_generic?busca='APROVDET'&param1=${encodeURIComponent(pedido)}`;

    try {
      const response = await firstValueFrom(this.http.get<ApiResponse>(url, { headers }));
      return response.items ?? response.itens ?? [];
    } catch (err) {
      console.error('❌ Erro ao buscar detalhes', pedido, err);
      return [];
    }
  }
}
