import Phaser from 'phaser';
import {species} from './model';
export function textures(scene:Phaser.Scene){
 const g=scene.make.graphics({x:0,y:0},false);
 for(const f of species){g.clear();g.fillStyle(f.color);g.fillTriangle(18,24,0,7,0,41);g.fillEllipse(40,24,54,34);g.fillStyle(0xffffff,.25);g.fillEllipse(38,15,30,8);g.fillStyle(0xffffff);g.fillCircle(55,20,5);g.fillStyle(0x102d42);g.fillCircle(56,20,2.5);if(f.id==='clown'||f.id==='zebra'){g.lineStyle(5,0xffffff,.85);g.lineBetween(30,11,30,36);g.lineBetween(43,8,43,39)}g.generateTexture(f.id,70,48)}
 g.clear();g.lineStyle(4,0xffeac4);g.beginPath();g.moveTo(16,1);g.lineTo(16,23);g.arc(8,23,8,0,Math.PI,false);g.lineTo(0,18);g.strokePath();g.generateTexture('hook',32,36);
 g.clear();g.fillStyle(0xa98ce5,.9);g.fillEllipse(24,16,46,28);g.lineStyle(3,0xcdb0ef);for(let x=8;x<45;x+=9){g.beginPath();g.moveTo(x,20);g.lineTo(x-3,31);g.lineTo(x+2,45);g.strokePath()}g.generateTexture('jelly',48,48);g.destroy()
}
export function ocean(scene:Phaser.Scene){const g=scene.add.graphics();g.fillGradientStyle(0x176b83,0x176b83,0x071d38,0x071d38,1);g.fillRect(0,0,450,800);g.fillStyle(0xa7eee1,.06);for(let i=0;i<5;i++)g.fillTriangle(i*110,0,i*110+45,0,i*110+150,630);for(let i=0;i<36;i++){g.lineStyle(1,0x9be5e0,.14);g.strokeCircle((i*97)%450,(i*137)%800,2+i%5)}return g}
export function label(s:Phaser.Scene,x:number,y:number,value:string,size=20,color='#e6f7f4'){return s.add.text(x,y,value,{fontFamily:'Arial, sans-serif',fontSize:size,color,fontStyle:'bold',align:'center'}).setOrigin(.5)}
export function button(s:Phaser.Scene,x:number,y:number,w:number,title:string,fn:()=>void){const b=s.add.rectangle(x,y,w,52,0xf4cc75).setStrokeStyle(2,0xffe4a9).setInteractive({useHandCursor:true});const t=label(s,x,y,title,18,'#172e40');b.on('pointerdown',()=>{b.setFillStyle(0xdab66a)});b.on('pointerup',()=>{b.setFillStyle(0xf4cc75);fn()});b.on('pointerout',()=>b.setFillStyle(0xf4cc75));return [b,t] as const}
