"""Dasi Elementary School: mapped footprints + photo-referenced exterior.

Blender --background --python scripts/build_dasi_school.py -- --render
The existing Geumseonggwan scene is never opened or overwritten.
"""
import bpy
import json
import math
import random
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'outputs' / 'dasi-elementary.blend'
if OUTPUT.exists() and '--replace' not in sys.argv:
    raise RuntimeError('Output exists. Save your edits separately before using -- --replace.')
OUTPUT.parent.mkdir(exist_ok=True)
(ROOT / 'public' / 'models').mkdir(exist_ok=True)
scene = bpy.data.scenes.new('Naju_Dasi_Elementary')
bpy.context.window.scene = scene
scene.unit_settings.system = 'METRIC'
groups = {}
for name in ('01_Mapped_Ground', '02_Photo_Exterior', '03_Estimated_Details', '04_Presentation'):
    collection = bpy.data.collections.new(name)
    scene.collection.children.link(collection)
    groups[name] = collection
LAT, LON = 35.017517, 126.6400205
bounds = [-120, 125, -100, 82]
SOURCE_URL = 'https://api.openstreetmap.org/api/0.6/map?bbox=126.63865,35.0167,126.6415,35.0186'
def project(lon, lat):
    return [(float(lon)-LON)*111320*math.cos(math.radians(LAT)), -(float(lat)-LAT)*111320]
def bp(x, y, z):
    return (x, -z, y)
xml = ET.parse(ROOT / 'knowledge/sources/dasi-school.osm').getroot()
nodes = {n.attrib['id']: project(n.attrib['lon'], n.attrib['lat']) for n in xml.findall('node')}
ways = {}
for w in xml.findall('way'):
    ways[w.attrib['id']] = dict(tags={t.attrib['k']:t.attrib['v'] for t in w.findall('tag')}, points=[nodes[n.attrib['ref']] for n in w.findall('nd') if n.attrib['ref'] in nodes])
solids, signs, places, buildings = [], [], [], []
materials = {}
def mat(color):
    if color not in materials:
        rgb = [int(color.lstrip('#')[i:i+2],16)/255 for i in (0,2,4)]
        rgb = [c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4 for c in rgb]
        m = bpy.data.materials.new('material_'+color.lstrip('#'))
        m.diffuse_color = (*rgb, 1)
        m.use_nodes = True
        bsdf = m.node_tree.nodes['Principled BSDF']
        bsdf.inputs['Base Color'].default_value = (*rgb,1)
        bsdf.inputs['Roughness'].default_value = .78
        materials[color] = m
    return materials[color]

def mesh_object(name, verts, faces, color, group='03_Estimated_Details'):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts,[],faces)
    mesh.update()
    uv = mesh.uv_layers.new(name='FacadeUV')
    for face in mesh.polygons:
        normal = face.normal
        tangent = Vector((-normal.y,normal.x,0)).normalized() if abs(normal.z)<.8 else Vector((1,0,0))
        for li in face.loop_indices:
            v=mesh.vertices[mesh.loops[li].vertex_index].co
            uv.data[li].uv = (v.dot(tangent)/1.2, (v.z if abs(normal.z)<.8 else v.y)/.56)
    obj = bpy.data.objects.new(name,mesh)
    groups[group].objects.link(obj)
    mesh.materials.append(mat(color))
    obj['provenance'] = group
    return obj

def box(name,x,y,z,w,h,d,color,collision=False,rotation=0,group='03_Estimated_Details'):
    vertices = [(-w/2,-d/2,-h/2),(w/2,-d/2,-h/2),(w/2,d/2,-h/2),(-w/2,d/2,-h/2),(-w/2,-d/2,h/2),(w/2,-d/2,h/2),(w/2,d/2,h/2),(-w/2,d/2,h/2)]
    o = mesh_object(name,vertices,[(3,2,1,0),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7),(4,5,6,7)],color,group)
    o.location = bp(x,y,z)
    o.rotation_euler.z = rotation
    o['collision'] = collision
    solids.append(dict(name=name,kind='box',position=[x,y,z],size=[w,h,d],color=color,collision=collision,rotation=rotation))
    return o

def polygon(name,pts,height,color,collision=False,base=0,group='01_Mapped_Ground'):
    pts = pts[:-1] if pts[0]==pts[-1] else pts
    # Enforce counterclockwise winding in Blender XY for outward normals.
    signed_area = sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(pts,pts[1:]+pts[:1]))
    if signed_area > 0: pts = list(reversed(pts))
    n = len(pts)
    vertices = [bp(x,base,z) for x,z in pts]+[bp(x,base+height,z) for x,z in pts]
    faces = [tuple(reversed(range(n))),tuple(range(n,n*2))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    o = mesh_object(name,vertices,faces,color,group)
    o['collision'] = collision
    solids.append(dict(name=name,kind='building',position=[0,base,0],size=[1,height,1],footprint=pts,color=color,collision=collision))
    return o

def segment(name,a,b,width,height,color,collision=False,base=0,group='03_Estimated_Details'):
    dx,dz = b[0]-a[0],b[1]-a[1]
    return box(name,(a[0]+b[0])/2,base+height/2,(a[1]+b[1])/2,math.hypot(dx,dz),height,width,color,collision,math.atan2(-dz,dx),group)

def clip(a,b):
    dx,dz=b[0]-a[0],b[1]-a[1]
    lo,hi=0.,1.
    for p,q in [(-dx,a[0]-bounds[0]),(dx,bounds[1]-a[0]),(-dz,a[1]-bounds[2]),(dz,bounds[3]-a[1])]:
        if abs(p)<1e-9:
            if q<0:return None
        elif p<0:lo=max(lo,q/p)
        else:hi=min(hi,q/p)
    return None if lo>hi else ([a[0]+lo*dx,a[1]+lo*dz],[a[0]+hi*dx,a[1]+hi*dz])

def cylinder(name,x,y,z,radius,height,color,vertices=12,group='03_Estimated_Details'):
    verts=[bp(x+radius*math.cos(i*2*math.pi/vertices),level,z+radius*math.sin(i*2*math.pi/vertices)) for level in (y-height/2,y+height/2) for i in range(vertices)]
    faces=[tuple(range(vertices)),tuple(reversed(range(vertices,vertices*2)))]+[(i,i+vertices,(i+1)%vertices+vertices,(i+1)%vertices) for i in range(vertices)]
    return mesh_object(name,verts,faces,color,group)

font_path=Path('C:/Windows/Fonts/malgun.ttf')
font=bpy.data.fonts.load(str(font_path)) if font_path.exists() else None
def label(text,x,y,z,width=8,rotation=0,color='#234150'):
    curve=bpy.data.curves.new('text_'+text,'FONT')
    curve.body=text; curve.align_x='CENTER'; curve.align_y='CENTER'; curve.size=1; curve.extrude=.008
    if font:curve.font=font
    o=bpy.data.objects.new('label_'+text,curve)
    groups['04_Presentation'].objects.link(o)
    o.location=bp(x,y,z); o.rotation_euler=(math.pi/2,0,rotation)
    o.data.materials.append(mat(color))
    bpy.context.view_layer.update()
    scale=min(width/max(o.dimensions.x,.01),1.05)
    o.scale=(scale,scale,scale)
    signs.append(dict(text=text,position=[x,y,z],width=width,rotation=rotation,color=color))

def tree(x,z,size=1,index=0):
    cylinder('tree-trunk_'+str(index),x,1.25*size,z,.18*size,2.5*size,'#7c6450')
    # Three offset low-poly crowns remain lightweight for the browser.
    for j,(dx,dy,dz,r) in enumerate(((0,3.3,0,1.6),(-.8,2.8,.3,1.25),(.7,2.9,-.35,1.25))):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=r*size,location=bp(x+dx*size,dy*size,z+dz*size))
        o=bpy.context.object; o.name=f'tree-crown_{index}_{j}'
        for c in list(o.users_collection):c.objects.unlink(o)
        groups['03_Estimated_Details'].objects.link(o)
        o.data.materials.append(mat(('#628358','#769356','#4f7551')[j]))

# Mapped ground and roads; widths are estimates.
box('ground_base',2.5,-1,-9,245,2,182,'#c4d1b6',group='04_Presentation')
campus=ways['963585633']['points']
polygon('ground_floor_campus',campus,.065,'#d5d6c9')
for wid,w in ways.items():
    if not w['tags'].get('highway'):continue
    width=2.2 if w['tags']['highway'] in ('footway','path','steps') else 6.5
    for i,(a,b) in enumerate(zip(w['points'],w['points'][1:])):
        clipped=clip(a,b)
        if not clipped:continue
        a,b=clipped
        if math.dist(a,b)<.1:continue
        segment(f'road-edge_{wid}_{i}',a,b,width+1.2,.03,'#eef0e1',group='01_Mapped_Ground')
        segment(f'road_{wid}_{i}',a,b,width,.045,'#89918d',group='01_Mapped_Ground')

# An original procedural brick material: no school photographs are republished.
rng=random.Random(1920)
brick_image=bpy.data.images.new('Original_brick_courses',width=128,height=128)
pixels=[]
for y in range(128):
    course=y//16
    for x in range(128):
        joint=(y%16<2 or (x+(32 if course%2 else 0))%64<2)
        jitter=rng.uniform(-.045,.045)
        color=(.68,.63,.56) if joint else (.46+jitter,.255+jitter,.205+jitter)
        pixels.extend((*color,1))
brick_image.pixels=pixels
brick_image.pack()
brick=mat('#884e3b')
texture=brick.node_tree.nodes.new('ShaderNodeTexImage'); texture.image=brick_image
brick.node_tree.links.new(texture.outputs['Color'],brick.node_tree.nodes['Principled BSDF'].inputs['Base Color'])

main=ways['963585634']['points'][:-1]
gym=ways['963585635']['points'][:-1]
for wid,pts,height,name in [('963585634',main,8.3,'교사동'),('963585635',gym,6.2,'서쪽 별동')]:
    buildings.append(dict(osm_id=wid,name=name,footprint=pts,height=height,height_source='Photo-informed estimate, not measured'))

# The complete, concave mapped footprint is retained rather than a rectangular substitute.
polygon('osm-building_963585634',main,8.3,'#884e3b',True,.065,'02_Photo_Exterior')
polygon('roof_main_flat',main,.18,'#aaa597',base=8.37,group='02_Photo_Exterior')

def facade_window(name,a,b,t,base,w=2.6,h=1.9,offset=.10):
    dx,dz=b[0]-a[0],b[1]-a[1]; length=math.hypot(dx,dz)
    ux,uz=dx/length,dz/length
    # Mapped polygon is clockwise in world XZ: left of edge is outside.
    nx,nz=uz,-ux
    x,z=a[0]+t*dx+nx*offset,a[1]+t*dz+nz*offset
    theta=math.atan2(-dz,dx)
    box(name+'_frame',x,base+h/2,z,w+.18,h+.18,.15,'#e6e6dc',rotation=theta,group='02_Photo_Exterior')
    box(name+'_glass',x+nx*.09,base+h/2,z+nz*.09,w,h,.04,'#47606a',rotation=theta,group='02_Photo_Exterior')
    for off in (-w/6,w/6):
        box(name+'_mullion',x+ux*off+nx*.13,base+h/2,z+uz*off+nz*.13,.055,h,.045,'#e9ede5',rotation=theta)
    box(name+'_transom',x+nx*.13,base+h*.73,z+nz*.13,w,.055,.045,'#e9ede5',rotation=theta)
    box(name+'_sill',x+nx*.08,base-.1,z+nz*.08,w+.35,.12,.35,'#d2cbb9',rotation=theta)

for i,(a,b) in enumerate(zip(main,main[1:]+main[:1])):
    length=math.dist(a,b)
    segment(f'brick-coping_{i}',a,b,.30,.16,'#aa6354',base=8.50,group='02_Photo_Exterior')
    segment(f'floor-band_{i}',a,b,.17,.19,'#d0b39a',base=3.88,group='02_Photo_Exterior')
    if length<3.5:continue
    bays=max(1,int(length/4.1))
    for j in range(bays):
        t=(j+.5)/bays
        for floor in (0,1):
            facade_window(f'window_{i}_{j}_{floor}',a,b,t,1.05+floor*3.6,w=min(2.75,length/bays-.8))

# South-facing covered walkway: visible in the school photo, depth is estimated.
front_edges=[20,21,22]
for i in front_edges:
    a,b=main[i],main[(i+1)%len(main)]
    dx,dz=b[0]-a[0],b[1]-a[1]; length=math.hypot(dx,dz)
    nx,nz=dz/length,-dx/length
    outside_a=[a[0]+nx*2.1,a[1]+nz*2.1]; outside_b=[b[0]+nx*2.1,b[1]+nz*2.1]
    segment(f'walk-floor_colonnade_{i}',outside_a,outside_b,4.1,.18,'#cfc9b5')
    segment(f'canopy_{i}',outside_a,outside_b,4.3,.25,'#d9ccb2',base=3.44,group='02_Photo_Exterior')
    count=max(2,int(length/4.3))
    for j in range(count+1):
        t=j/count
        x=a[0]+t*dx+nx*3.65; z=a[1]+t*dz+nz*3.65
        cylinder(f'colonnade_pillar_{i}_{j}',x,1.75,z,.18,3.5,'#e8d6b4')
        box(f'column_collision_{i}_{j}',x,.05,z,.36,.1,.36,'#d7cdb8',True)

# Clock and cream-colored roof feature on the front's western wing.
a,b=main[22],main[0]
dx,dz=b[0]-a[0],b[1]-a[1]; ln=math.hypot(dx,dz); ux,uz=dx/ln,dz/ln; nx,nz=uz,-ux
clock_x,clock_z=(a[0]+b[0])/2+nx*.25,(a[1]+b[1])/2+nz*.25
theta=math.atan2(-dz,dx)
box('clock_roof_beam',clock_x,9.25,clock_z,13.0,.35,1.1,'#e2d7bd',rotation=theta,group='02_Photo_Exterior')
for off in (-5.6,0,5.6):
    box('clock_roof_support',clock_x+ux*off,8.7,clock_z+uz*off,.48,1.1,.55,'#e2d7bd',rotation=theta,group='02_Photo_Exterior')
# Circular school mark: the photo does not establish that this is a clock.
bpy.ops.mesh.primitive_cylinder_add(vertices=48,radius=.64,depth=.10,location=bp(clock_x+nx*.15,7.38,clock_z+nz*.15))
clock=bpy.context.object; clock.name='school_round_emblem'
clock.rotation_euler=(math.pi/2,0,theta)
for c in list(clock.users_collection):c.objects.unlink(clock)
groups['02_Photo_Exterior'].objects.link(clock); clock.data.materials.append(mat('#edf0db'))
label('다시',clock_x+nx*.24,7.38,clock_z+nz*.24,.62,theta,'#4e655e')
label('다시초등학교',clock_x+nx*.28,4.2,clock_z+nz*.28,8.5,theta,'#fff3dc')

# Pink end panels and taller stair-tower caps seen on the front elevation.
for i,t in ((22,.90),(20,.07)):
    sa,sb=main[i],main[(i+1)%len(main)]
    sx,sz=sb[0]-sa[0],sb[1]-sa[1]; sl=math.hypot(sx,sz)
    snx,snz=sz/sl,-sx/sl; st=math.atan2(-sz,sx)
    cx,cz=sa[0]+t*sx,sa[1]+t*sz
    box(f'pink_stair_panel_{i}',cx+snx*.20,4.55,cz+snz*.20,3.8,9.1,.3,'#c59187',rotation=st,group='02_Photo_Exterior')
    box(f'pink_stair_roof_{i}',cx-snx*2,8.7,cz-snz*2,4.1,.9,4.4,'#c59187',rotation=st,group='02_Photo_Exterior')

# Climbing greenery concentrated on the western facade as seen in the photo.
for j in range(28):
    t=.61+(j%7)*.048
    x=a[0]+t*dx+nx*.25; z=a[1]+t*dz+nz*.25
    box(f'ivy_{j}',x,4.6+(j//7)*.95,z,.35+(j%3)*.18,.78,.08,('#405f38','#4b6b3e','#557449')[j%3],rotation=theta,group='02_Photo_Exterior')

# Western hall: actual footprint, red barrel roof and light front band from photos.
polygon('osm-building_963585635',gym,6.2,'#c58b85',True,.065,'02_Photo_Exterior')
g0,g1,g2,g3=gym
front=[(g0[0]+g1[0])/2,(g0[1]+g1[1])/2]
back=[(g2[0]+g3[0])/2,(g2[1]+g3[1])/2]
width=math.dist(g0,g1)+1.2
depth=math.dist(front,back)+1.2
gx,gz=(front[0]+back[0])/2,(front[1]+back[1])/2
gux,guz=(g1[0]-g0[0])/math.dist(g0,g1),(g1[1]-g0[1])/math.dist(g0,g1)
gvx,gvz=(back[0]-front[0])/math.dist(front,back),(back[1]-front[1])/math.dist(front,back)
N=24
verts=[]
for v in (-depth/2,depth/2):
    for i in range(N+1):
        angle=math.pi*i/N
        u=math.cos(angle)*width/2
        verts.append(bp(gx+gux*u+gvx*v,6.3+math.sin(angle)*4.4,gz+guz*u+gvz*v))
faces=[(i,i+1,i+N+2,i+N+1) for i in range(N)]
faces.extend([tuple(reversed(range(N+1))),tuple(range(N+1,2*N+2))])
mesh_object('roof_west_barrel',verts,faces,'#a9544e','02_Photo_Exterior')
segment('west_front_white_band',g0,g1,1.0,.8,'#e2e4db',base=5.25,group='02_Photo_Exterior')
for j in range(6):
    # The gym front edge has the opposite winding from the main block.
    facade_window(f'west_window_{j}',g1,g0,(j+.5)/6,3.3,w=2.0,h=1.35)
for j in range(11):
    u=-width/2+j*width/10
    # White narrow roof seams follow the curved cross section at the front.
    y=6.3+4.4*math.sqrt(max(0,1-(u/(width/2))**2))
    segment(f'roof_west_seam_{j}',[gx+gux*u-gvx*depth/2,gz+guz*u-gvz*depth/2],[gx+gux*u+gvx*depth/2,gz+guz*u+gvz*depth/2],.06,.055,'#cc9b90',base=y)

# Lawn and circulation are traced approximately from photos, not surveyed.
lawn=[[-76,29],[-71,-1],[-45,2],[-13,8],[14,12],[9,42]]
polygon('ground_floor_school_lawn',lawn,.015,'#8ba357',base=.065,group='03_Estimated_Details')
segment('field_edge_path',[-81,33],[15,48],2.3,.09,'#b8b5a4')
segment('school_front_path',[-74,-8],[20,10],3.1,.10,'#c8af83')
segment('entry_path',[70,8],[23,3],4.5,.11,'#b6b9ad')

# Small blue-roofed building and sports court are visible in the 2025 photo.
# Their coordinates and dimensions are estimates because OSM does not map them.
box('photo-building_blue_annex',8,2.0,35,8,4,6,'#e4e5dd',True)
annex_verts=[bp(x,y,z) for x,y,z in [(3.6,4,31.6),(12.4,4,31.6),(12.4,4,38.4),(3.6,4,38.4),(8,5.6,31.6),(8,5.6,38.4)]]
mesh_object('roof_blue_annex',annex_verts,[(0,4,5,3),(4,1,2,5),(0,1,4),(3,5,2)],'#3a89b4','02_Photo_Exterior')
box('annex_door',8,1.35,31.94,1.45,2.6,.16,'#536763')
box('annex_awning',8,3.15,31.4,2.3,.18,1.5,'#729c8a')
box('ground_floor_sport_court',31,.085,5,17,.025,12,'#ab6553')
for ax,az,bx,bz in [(23.2,-.3,38.8,-.3),(38.8,-.3,38.8,10.3),(38.8,10.3,23.2,10.3),(23.2,10.3,23.2,-.3),(31,-.3,31,10.3)]:
    segment('court_marking',[ax,az],[bx,bz],.09,.005,'#e6dbc2',base=.10)

# Site boundary follows OSM; fence height, openings and landscaping are estimates.
for i,(a,b) in enumerate(zip(campus,campus[1:])):
    if i==6:continue  # east access side kept open in this exterior exploration model
    segment(f'boundary_wall_{i}',a,b,.35,.45,'#b9b9a8',True)
    segment(f'boundary_rail_{i}',a,b,.09,.065,'#566c61',base=1.2)
    n=max(1,int(math.dist(a,b)/2.2))
    for j in range(n+1):
        t=j/n
        cylinder(f'boundary_post_{i}_{j}',a[0]+(b[0]-a[0])*t,.76,a[1]+(b[1]-a[1])*t,.035,1.05,'#536b60',8)
# Photo-informed stone gate, with an approximate east-side placement.
for i,z in enumerate((-1,13)):
    box(f'gate_pier_{i}',82.5,1.4,z,1.25,2.8,1.25,'#b3b4ab',True)
    for level,width in enumerate((1.65,1.3,.95)):
        box(f'gate_cap_{i}_{level}',82.5,2.86+level*.18,z,width,.18,width,'#c2c3b9')
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=8,radius=.32,location=bp(82.5,3.56,z))
    o=bpy.context.object; o.name=f'gate_finial_{i}'
    for c in list(o.users_collection):c.objects.unlink(o)
    groups['02_Photo_Exterior'].objects.link(o); o.data.materials.append(mat('#b9bcb4'))
    box(f'gate_nameplate_{i}',83.15,1.45,z,.08,2.0,.45,'#275a4b')
    label('다\n시\n초\n등\n학\n교',83.20,1.5,z,.4,math.pi/2,'#d8bd73')
box('centenary_monument',79,2.45,-4,1.2,4.9,.8,'#c8ccc1',True)
label('개교\n100주년',79,3.1,-3.56,1.0,0,'#42564c')
for i,(x,z,s) in enumerate([(-78,21,1.5),(-75,8,1.6),(-65,40,1.3),(-52,42,1.25),(-29,46,1.2),(-10,48,1.3),(13,39,1.6),(70,-34,1.6),(74,-20,1.4),(70,-6,1.7),(64,17,1.5),(38,-62,1.2),(-57,-61,1.3)]):
    tree(x,z,s,i)
for i in range(3):
    x,z=31+i*5,13+i*.2
    box('bench_seat',x,.55,z,2.8,.14,.60,'#927052',True)
    box('bench_back',x,.93,z+.3,2.8,.5,.10,'#927052')
    for off in (-1,1):box('bench_leg',x+off,.26,z,.10,.52,.5,'#526359')

spawn=dict(x=65,z=5,yaw=1.12)
places=[
    dict(id='clock-front',name='본관 앞',position=[clock_x+nx*8,clock_z+nz*8],radius=13,description='붉은 벽돌과 흰 창틀, 사진 속 원형 장식을 찾아보세요.'),
    dict(id='west-hall',name='서쪽 별동 앞',position=[front[0],front[1]+6],radius=13,description='둥근 붉은 지붕을 사진에 맞춰 표현했어요.'),
    dict(id='school-field',name='운동장',position=[-29,23],radius=39,description='잔디가 보이는 학교 사진을 참고한 운동장입니다.'),
    dict(id='east-yard',name='교사동 옆마당',position=[62,2],radius=25,description='건물 사이와 운동장을 걸어보세요. 실내는 구현하지 않았어요.'),
]
limitations=[
    'School boundary and two building footprints use OpenStreetMap coordinates.',
    'Two-story brick facades, light window frames, round emblem, ivy, stone gate and barrel roof are photo-informed.',
    'Heights, window counts, emblem placement, lawn extent, paths, trees, gate location, fence openings and details are approximate.',
    'The blue-roof annex and court are photo-informed approximations without surveyed or OSM footprints. Matching the barrel roof to the west OSM building is an inference.',
    'Flat terrain. Exterior only; no surveyed interior, classroom layout or photogrammetric reconstruction.',
]
world=dict(title='나주 산책',subtitle='다시초등학교 · 실제 지도와 사진 참고',source='© OpenStreetMap contributors, ODbL 1.0',source_url=SOURCE_URL,origin=dict(lat=LAT,lon=LON),bounds=bounds,spawn=spawn,solids=solids,signs=signs,places=places,buildings=buildings,limitations=limitations,campus_osm_id='963585633')
(ROOT/'public/dasi-world.json').write_text(json.dumps(world,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
(ROOT/'knowledge/sources/dasi-model-provenance.json').write_text(json.dumps({k:world[k] for k in ('source','source_url','origin','campus_osm_id','buildings','limitations')},ensure_ascii=False,indent=2),encoding='utf-8')

bpy.ops.object.camera_add(location=(50,-145,125))
camera=bpy.context.object; camera.name='School_overview_camera'
camera.rotation_euler=(Vector((-5,15,0))-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.type='ORTHO'; camera.data.ortho_scale=200; scene.camera=camera
bpy.ops.object.light_add(type='SUN',location=(-70,-80,130))
sun=bpy.context.object; sun.rotation_euler=(.6,-.4,-.4); sun.data.energy=2.3; sun.data.angle=.14
scene.world=bpy.data.worlds.new('School_daylight'); scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.65,.78,.85,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.65
scene.render.engine='BLENDER_EEVEE_NEXT'
scene.render.resolution_x=1440; scene.render.resolution_y=1000; scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.render.filepath=str(ROOT/'outputs/dasi-overview.png')
scene.view_settings.view_transform='AgX'
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT))
bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/models/dasi-elementary.glb'),export_format='GLB',use_active_scene=True,export_cameras=False,export_lights=False,export_extras=True,export_apply=True)
print(json.dumps(dict(blend=str(OUTPUT),buildings=len(buildings),objects=len(scene.objects),spawn=spawn),ensure_ascii=False))
if '--render' in sys.argv:bpy.ops.render.render(write_still=True)
