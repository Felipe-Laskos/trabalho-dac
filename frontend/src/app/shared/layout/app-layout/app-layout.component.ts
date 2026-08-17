import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToolbarModule } from 'primeng/toolbar';
import { MenuModule } from 'primeng/menu';
import { ToastComponent } from '../../toast/toast.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    ToolbarModule,
    MenuModule,
    ToastComponent
  ],
  templateUrl: './app-layout.component.html',
  styleUrl: './app-layout.component.scss'
})
export class AppLayoutComponent {

menuItems = [
    {
      label: 'alterar',
      icon: 'pi pi-home',
      routerLink: '/dashboard'
    }
  ];
}