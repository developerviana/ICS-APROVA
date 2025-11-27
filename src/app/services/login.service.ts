import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoginService {
  private readonly url = 'https://institutoclima128987.protheus.cloudtotvs.com.br:4050/rest/iCS/PostGeneric';
  //private readonly url = 'http://localHost:8400/rest/iCS/PostGeneric';

  constructor(private http: HttpClient) {}

  async validarLogin(usuario: string, senha: string): Promise<boolean> {
    const credentials = btoa(`${usuario}:${senha}`);

    const headers = new HttpHeaders({
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json'
    });

    const body = {
      login: [
        { login: 'ok' }
      ]
    };

    try {
      await firstValueFrom(this.http.post(this.url, body, { headers }));

      // SALVAR TOKEN + USUÁRIO PARA USO NO SERVICE
      localStorage.setItem('authToken', credentials);
      localStorage.setItem('authUser', usuario.trim());

      return true;

    } catch (error: any) {
      if (error.status === 401) {
        return false;
      }
      throw error;
    }
  }

}
