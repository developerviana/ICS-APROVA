import { Component, OnInit, ViewChild } from '@angular/core';
import {
  PoPageModule,
  PoTableModule,
  PoPageAction,
  PoTableColumn,
  PoNotificationService,
  PoDialogService,
  PoLoadingModule,
  PoDialogModule,
  PoNotificationModule,
  PoFieldModule,
  PoButtonModule,
  PoContainerModule,
  PoWidgetModule,
  PoDatepickerModule,
  PoModalModule,
  PoModalComponent,
  PoDropdownModule
} from '@po-ui/ng-components';
import { CommonModule } from '@angular/common';
import { ItensAprovarService } from '../../services/itens-aprovar.service';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { debounceTime } from 'rxjs/operators';
import { ProThreadInfoService, ProUserInfoService, ProUserPswretInterface } from '@totvs/protheus-lib-core';

@Component({
  selector: 'app-itens-aprovar',
  standalone: true,
  templateUrl: './itens-aprovar.component.html',
  imports: [
    CommonModule,
    PoPageModule,
    PoTableModule,
    PoLoadingModule,
    PoDialogModule,
    PoNotificationModule,
    ReactiveFormsModule,
    FormsModule,
    PoFieldModule,
    PoButtonModule,
    PoContainerModule,
    PoWidgetModule,
    PoDatepickerModule,
    PoModalModule,
    PoDropdownModule
  ]
})
export class ItensAprovarComponent implements OnInit {
  dateRangeControl = new FormControl();
  filtroControl = new FormControl('');
  statusControl = new FormControl('F');

  itens: any[] = [];
  itensTodos: any[] = [];
  itensFiltrados: any[] = [];
  columns: PoTableColumn[] = [];
  isLoading = false;
  page = 0;
  pageSize = 20;
  hasMore = true
  showModalRejeitar = false;
  motivoRejeicao = '';
  itemParaRejeitar: any = null;
  tipoControl = new FormControl('todos');
  filtroCustoConta = new FormControl('');

  user: any = null;
  isProtheusEmbedded = false;

  @ViewChild('modalRejeitar') modalRejeitar!: PoModalComponent;

  confirmarRejeicaoAction = {
    label: 'Confirmar',
    action: () => this.confirmarRejeicao()
  };

  cancelarRejeicaoAction = {
    label: 'Cancelar',
    action: () => this.modalRejeitar.close()
  };

  actions: PoPageAction[] = [
    {
      label: 'Aprovar selecionados',
      action: () => this.aprovarSelecionados(),
      disabled: () => !this.itens.some(i => i.$selected) || this.itens.some(i => i.$selected && i.aprova === 'R'),
      icon: 'an an-check-fat'
    }
  ];

  dropdownActions = [
    {
      label: 'Limpar Filtros',
      action: () => this.limparFiltro(),
      icon: 'po-icon-close'
    },
    {
      label: 'Atualizar',
      action: () => this.loadData(),
      icon: 'po-icon-refresh'
    },
    {
      label: 'Sair',
      action: () => this.logoff(),
      icon: 'po-icon-exit'
    }
  ];

  constructor(
    private itensService: ItensAprovarService,
    private poNotification: PoNotificationService,
    private poDialog: PoDialogService,
    private proThreadInfoService: ProThreadInfoService,
    private proUserInfoService: ProUserInfoService
  ) {}

  ngOnInit() {
    // Detecta se está embarcado no Protheus
    try {
      this.proThreadInfoService.getUserInfoThread().subscribe({
        next: (res: any) => {
          this.user = res;
          this.isProtheusEmbedded = true;
          this.getProtheusUserInfo();
        },
        error: () => {
          this.isProtheusEmbedded = false;
          this.loadData(); // fluxo web normal
        }
      });
    } catch {
      this.isProtheusEmbedded = false;
      this.loadData();
    }

    this.dateRangeControl.valueChanges
      .pipe(debounceTime(200))
      .subscribe(() => this.filtrarItens(this.filtroControl.value || ''));

    this.filtroControl.valueChanges
      .pipe(debounceTime(300))
      .subscribe(valor => this.filtrarItens(valor || ''));

    this.statusControl.valueChanges
      .pipe(debounceTime(100))
      .subscribe(() => this.filtrarItens(this.filtroControl.value || ''));

    this.tipoControl.valueChanges
      .pipe(debounceTime(100))
      .subscribe(() => this.filtrarItens(this.filtroControl.value || ''));

    this.filtroCustoConta.valueChanges
      .pipe(debounceTime(300))
      .subscribe(() => this.filtrarItens(this.filtroControl.value || ''));
  }

  getProtheusUserInfo() {
    this.proUserInfoService.pswRet().subscribe((pswret: ProUserPswretInterface) => {
      // Aqui você pode usar pswret.user_id, pswret.user_name, etc.
      // Exemplo: this.userEmail = pswret.email;
      // Depois, chame o loadData passando o usuário embarcado:
      this.loadDataProtheus();
    });
  }

  async loadDataProtheus() {
    this.page = 0;
    this.hasMore = true;
    //this.itensTodos = await this.itensService.getItens();
    const itens = await this.itensService.getItens();

    this.itensTodos.forEach(item => {
      if (item.emissao && typeof item.emissao === 'string' && item.emissao.length === 8) {
        const ano = Number(item.emissao.substring(0, 4));
        const mes = Number(item.emissao.substring(4, 6)) - 1;
        const dia = Number(item.emissao.substring(6, 8));
        item.emissao = new Date(ano, mes, dia);
      }
      if (item.observacao) {
        item.observacao = item.observacao
          .replace(/�/g, ' ')
          .replace(/Ã§/g, 'ç')
          .replace(/Ã£/g, 'ã')
          .replace(/Ã¡/g, 'á')
          .replace(/Ã©/g, 'é')
          .replace(/Ãº/g, 'ú')
          .replace(/Ãô/g, 'ô')
          .replace(/Ãê/g, 'ê')
          .replace(/Ã¢/g, 'â')
          .replace(/Ã³/g, 'ó');
      }
      item.acoes = 'rejeitar';
      item.detalhes = 'detalhes';
    });

    this.itensFiltrados = [...this.itensTodos];
    this.columns = [
      {
        property: 'detalhes',
        label: 'Detalhes',
        type: 'icon',
        width: '5%',
        sortable: false,
        icons: [
          {
            action: this.abrirDetalhes.bind(this),
            icon: 'an an-eye',
            tooltip: 'Ver detalhes',
            value: 'detalhes',
            color: 'color-02'
          }
        ]
      },
      { property: 'pedido', label: 'Pedido', type: 'string' },
      { property: 'tipo', label: 'Tipo', type: 'string' },
      { property: 'emissao', label: 'Emissão', type: 'date' },
      { property: 'fornecedor', label: 'Fornecedor', type: 'string' },
      //{ property: 'observacao', label: 'Observação', type: 'string' },
      { property: 'total', label: 'Total', type: 'currency', format: 'BRL' },
      { property: 'centroc', label: 'C. Custo', type: 'string' },
      { property: 'itemcta', label: 'Item Cont', type: 'string' },
      {
        property: 'aprova',
        label: 'Situação',
        type: 'icon',
        icons: [
          { value: 'L', icon: 'an an-thumbs-up', color: 'color-10', tooltip: 'Aprovado' },
          { value: 'R', icon: 'an an-x', color: 'color-07', tooltip: 'Rejeitado' },
          { value: 'F', icon: 'an an-watch', color: 'color-08', tooltip: 'Aguardando Aprovação' },
          { value: 'B', icon: 'an an-watch', color: 'color-08', tooltip: 'Aguardando Aprovação' }
        ]
      },
      {
        property: 'acoes',
        label: 'Ações',
        type: 'icon',
        width: '4%',
        sortable: false,
        icons: [
          {
            action: this.abrirModalRejeitar.bind(this),
            icon: 'po-icon-delete',
            value: 'rejeitar',
            tooltip: 'Rejeitar pedido',
            color: 'color-07'
          }
        ]
      }
    ];

    this.filtrarItens(this.filtroControl.value || '');
  }

  async loadData() {
  this.page = 0;
  this.hasMore = true;

  // Busca itens da API corretamente
  const itens = await this.itensService.getItens();
  this.itensTodos = Array.isArray(itens) ? itens : [];

  console.log('API retornou:', this.itensTodos);

  this.itensTodos.forEach(item => {
    if (item.emissao && typeof item.emissao === 'string' && item.emissao.length === 8) {
      const ano = Number(item.emissao.substring(0, 4));
      const mes = Number(item.emissao.substring(4, 6)) - 1;
      const dia = Number(item.emissao.substring(6, 8));
      item.emissao = new Date(ano, mes, dia);
    }
    if (item.observacao) {
      item.observacao = item.observacao
        .replace(/�/g, ' ')
        .replace(/Ã§/g, 'ç')
        .replace(/Ã£/g, 'ã')
        .replace(/Ã¡/g, 'á')
        .replace(/Ã©/g, 'é')
        .replace(/Ãº/g, 'ú')
        .replace(/Ãô/g, 'ô')
        .replace(/Ãê/g, 'ê')
        .replace(/Ã¢/g, 'â')
        .replace(/Ã³/g, 'ó');
    }
    item.acoes = 'rejeitar';
    item.detalhes = 'detalhes';
  });

  console.log('Itens após tratamento:', this.itensTodos);

  this.itensFiltrados = [...this.itensTodos];
  this.columns = [
    {
      property: 'detalhes',
      label: 'Detalhes',
      type: 'icon',
      width: '5%',
      sortable: false,
      icons: [
        {
          action: this.abrirDetalhes.bind(this),
          icon: 'an an-eye',
          tooltip: 'Ver detalhes',
          value: 'detalhes',
          color: 'color-02'
        }
      ]
    },
    { property: 'pedido', label: 'Pedido', type: 'string' },
    { property: 'tipo', label: 'Tipo', type: 'string' },
    { property: 'emissao', label: 'Emissão', type: 'date' },
    { property: 'fornecedor', label: 'Fornecedor', type: 'string' },
    { property: 'total', label: 'Total', type: 'currency', format: 'BRL' },
    { property: 'centroc', label: 'C. Custo', type: 'string' },
    { property: 'itemcta', label: 'Item Cont', type: 'string' },
    {
      property: 'aprova',
      label: 'Situação',
      type: 'icon',
      icons: [
        { value: 'L', icon: 'an an-thumbs-up', color: 'color-10', tooltip: 'Aprovado' },
        { value: 'R', icon: 'an an-x', color: 'color-07', tooltip: 'Rejeitado' },
        { value: 'F', icon: 'an an-watch', color: 'color-08', tooltip: 'Aguardando Aprovação' },
        { value: 'B', icon: 'an an-watch', color: 'color-08', tooltip: 'Aguardando Aprovação' }
      ]
    },
    {
      property: 'acoes',
      label: 'Ações',
      type: 'icon',
      width: '4%',
      sortable: false,
      icons: [
        {
          action: this.abrirModalRejeitar.bind(this),
          icon: 'po-icon-delete',
          value: 'rejeitar',
          tooltip: 'Rejeitar pedido',
          color: 'color-07'
        }
      ]
    }
  ];

  this.filtrarItens(this.filtroControl.value || '');
}

async abrirDetalhes(item: any) {
  const pedido = item.pedido;
  if (!pedido) return;

  try {
    const detalhes = await this.itensService.getDetalhesPedido(pedido);

    if (!detalhes.length) {
      this.poNotification.warning('Nenhum detalhe encontrado para o pedido.');
      return;
    }

    const detalheTexto = detalhes.map(d =>
      `Contrato: ${d.contrato}\nProduto: ${d.produto} - ${d.descricao}\nC. Custo: ${d.cc} - ${d.centroc}\nItem Cta: ${d.item} - ${d.itemcta}\nClasse: ${d.classe} - ${d.desclass}\nObservação: ${d.observacao || '---'}`
    ).join('\n\n');

    this.poDialog.alert({
      title: `Detalhes do Pedido ${pedido}`,
      message: `<pre>${detalheTexto}</pre>`
    });

  } catch (error) {
    console.error(error);
    this.poNotification.error('Erro ao buscar detalhes do pedido.');
  }
}


  filtrarItens(termo: string) {
    const termoLower = (termo || '').toLowerCase();
    const status = this.statusControl.value;
    const dateRange = this.dateRangeControl.value;
    const tipo = this.tipoControl.value;
    const termoCustoConta = this.filtroCustoConta.value?.toLowerCase() || '';

    let resultado = this.itensTodos;

    // Só filtra por termo se houver termo
    if (termoLower) {
      resultado = resultado.filter(item => {
        const doc = item.pedido?.toLowerCase() || '';
        const forn = item.fornecedor?.toLowerCase() || '';
        const obs = item.observacao?.toLowerCase() || '';
        return doc.includes(termoLower) || forn.includes(termoLower) || obs.includes(termoLower);
      });
    }

    if (termoCustoConta) {
      resultado = resultado.filter(item => {
        const centro = item.centroc?.toLowerCase() || '';
        const itemcta = item.itemcta?.toLowerCase() || '';
        return centro.includes(termoCustoConta) || itemcta.includes(termoCustoConta);
      });
    }

    // Filtro de status
    if (status && status !== 'todos') {
      // Quando o filtro for 'F' (Em Aprovação) ou 'B', aceitar ambos os códigos
      if (status === 'F' || status === 'B') {
        resultado = resultado.filter(item => item.aprova === 'F' || item.aprova === 'B');
      } else {
        resultado = resultado.filter(item => item.aprova === status);
      }
    }

    if (dateRange?.start && dateRange?.end) {
      const start = new Date(dateRange.start);
      const end = new Date(dateRange.end);
      resultado = resultado.filter(item => {
        const emissao = new Date(item.emissao);
        return emissao >= start && emissao <= end;
      });
    }

    if (tipo !== 'todos') {
      resultado = resultado.filter(item => item.tipo === tipo);
    }

    this.itensFiltrados = resultado;
    this.page = 0;
    this.hasMore = true;
    // Força nova referência para o array exibido no po-table
    this.itens = [...this.itensFiltrados.slice(0, this.pageSize)];
  }

  loadMore() {
    this.page++;
    const start = this.page * this.pageSize;
    const end = start + this.pageSize;
    const novosItens = this.itensFiltrados.slice(start, end);
    this.itens.push(...novosItens);

    if (this.itens.length >= this.itensFiltrados.length) {
      this.hasMore = false;
    }
  }

  limparFiltro() {
    this.filtroControl.setValue('');
    this.filtroCustoConta.setValue('');
    this.statusControl.setValue('F');
    this.dateRangeControl.setValue(null);
  }

  async aprovarSelecionados() {
    // Se houver algum item selecionado com aprova === 'R', exibe mensagem e não envia
    const selecionados = this.itens.filter(i => i.$selected);
    const rejeitados = selecionados.filter(i => i.aprova === 'R');

    if (rejeitados.length) {
      this.poNotification.warning('Itens rejeitados não podem ser aprovados. Desmarque os itens rejeitados para continuar.');
      return;
    }
    if (!selecionados.length) {
      this.poNotification.warning('Nenhum item selecionado para aprovação.');
      return;
    }

    this.poDialog.confirm({
      title: 'Confirmar aprovação',
      message: `Deseja realmente aprovar ${selecionados.length} item(ns)?`,
      confirm: async () => {
        this.isLoading = true;
        try {
          await this.itensService.aprovarItensSelecionados(selecionados);
          this.poNotification.success(`${selecionados.length} item(ns) aprovado(s) com sucesso.`);
          this.limparFiltro();
          await this.loadData();
        } catch (error) {
          console.error(error);
          this.poNotification.error('Erro ao enviar aprovação.');
        } finally {
          this.isLoading = false;
        }
      }
    });
  }

  abrirModalRejeitar(item: any) {
    this.itemParaRejeitar = item;
    this.motivoRejeicao = '';
    this.modalRejeitar.open();
  }

  async confirmarRejeicao() {
    if (!this.motivoRejeicao.trim()) {
      this.poNotification.warning('Informe o motivo da rejeição.');
      return;
    }

    this.modalRejeitar.close();
    this.isLoading = true;

    try {
      await this.itensService.rejeitarItemService(this.itemParaRejeitar, this.motivoRejeicao);
      this.poNotification.success(`pedido ${this.itemParaRejeitar.pedido} rejeitado com sucesso.`);
      this.loadData();
    } catch (error) {
      console.error(error);
      this.poNotification.error('Erro ao rejeitar o pedido.');
    } finally {
      this.isLoading = false;
    }
  }

  logoff() {
    localStorage.clear();
    window.location.href = '/';
  }
}
