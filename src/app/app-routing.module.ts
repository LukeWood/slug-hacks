import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import {SplashComponent} from './splash/splash.component';
import {GameComponent} from './game/game.component';

const routes: Routes = [
  {path: 'game' , component: GameComponent},
  {path: '' , component: SplashComponent}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
