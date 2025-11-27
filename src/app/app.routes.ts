import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { ItensAprovarComponent } from './pages/itens-aprovar/itens-aprovar.component';

export const routes: Routes = [
  { path: '', component: LoginComponent },
  { path: 'itens-aprovar', component: ItensAprovarComponent }
];
