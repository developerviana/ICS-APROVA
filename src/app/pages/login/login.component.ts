import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  PoContainerModule,
  PoInfoModule,
  PoNotificationService
} from '@po-ui/ng-components';
import {
  PoPageLoginModule,
  PoPageLoginLiterals,
  PoPageLogin
} from '@po-ui/ng-templates';
import { LoginService } from '../../services/login.service';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.component.html',
  imports: [
    CommonModule,
    PoContainerModule,
    PoInfoModule,
    PoPageLoginModule
  ]
})
export class LoginComponent {

  literals: PoPageLoginLiterals = {
    loginPlaceholder: 'Digite seu usuário',
    loginLabel: 'Usuário',
    passwordPlaceholder: 'Digite sua senha',
    passwordLabel: 'Senha',
    submitLabel: 'Entrar',
    loginErrorPattern: 'Usuário é obrigatório',
    passwordErrorPattern: 'Senha é obrigatória',
    rememberUser: 'Lembrar usuário',
    loginHint: 'Informe suas credenciais para entrar no sistema.'
  };


  constructor(
    private loginService: LoginService,
    private poNotification: PoNotificationService
  ) {}

  async onLogin($event: any) {
    console.log('Login event recebido', $event)
    const { login, password } = $event as PoPageLogin;

    try {
      const isValid = await this.loginService.validarLogin(login, password);

      if (isValid) {
        localStorage.setItem('authToken', btoa(`${login}:${password}`));
        localStorage.setItem('username', login);

        this.poNotification.success(`Login autorizado para ${login}`);
        window.location.href = '/itens-aprovar';
      } else {
        this.poNotification.error('Usuário ou senha inválidos');
      }
    } catch (err) {
      this.poNotification.error('Erro ao conectar com o servidor');
    }
  }
}
