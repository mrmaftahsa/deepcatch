import Phaser from 'phaser';
import {Home,Dive,Book,Results,Boot} from './scenes';
import './style.css';
const game=new Phaser.Game({type:Phaser.AUTO,parent:'game',width:450,height:800,backgroundColor:'#071d38',scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:[Boot,Home,Dive,Book,Results],render:{antialias:true}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)game.loop.sleep();else game.loop.wake()});
