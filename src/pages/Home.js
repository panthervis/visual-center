import React from "react";
import { Container, Row, Col, Card, Button, Jumbotron } from "react-bootstrap";
import { Link } from "react-router-dom";
import { emojify } from "react-emojione";

import TeamPosterImg from "../assets/img/team-poster.jpg";
import IndividualPosterImg from "../assets/img/individual-poster.jpg";
import ComboPosterImg from "../assets/img/combo-poster.png";
import PhotoDayImg from "../assets/img/photo-day.jpg";

import "./Home.css";

class Home extends React.Component {
  constructor(props) {
    super();

    this.state = {};
  }

  render() {
    return (
      <div>
        <Container>
          <Row className="home-header">
            <Jumbotron fluid>
              <Container>
                <h1>
                  We help you make fantastic{" "}
                  <i>
                    <b>Posters!</b>
                  </i>{" "}
                  {emojify(" 🤩")}
                </h1>
                <p>
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                  Aliquam eget odio ac massa ullamcorper lacinia. Donec et
                  tristique orci. Sed vitae lectus condimentum, sollicitudin
                  mauris vitae, consectetur massa.
                </p>
              </Container>
            </Jumbotron>
          </Row>
          <Row>
            <Col xs={12} md={4}>
              <Card style={{ width: "21rem" }}>
                <Card.Img variant="top" src={TeamPosterImg} />
                <Card.Body>
                  <Card.Title>Team Poster</Card.Title>
                  <Card.Text>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                    Aliquam eget odio ac massa ullamcorper lacinia. Donec et
                    tristique orci. Sed vitae lectus condimentum, sollicitudin
                    mauris vitae, consectetur massa.
                  </Card.Text>
                  <Link to="/team-poster">
                    <Button variant="primary" size="lg">
                      Select
                    </Button>
                  </Link>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={12} md={4}>
              <Card style={{ width: "21rem" }}>
                <Card.Img variant="top" src={IndividualPosterImg} />
                <Card.Body>
                  <Card.Title>Individual Poster</Card.Title>
                  <Card.Text>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                    Aliquam eget odio ac massa ullamcorper lacinia. Donec et
                    tristique orci. Sed vitae lectus condimentum, sollicitudin
                    mauris vitae, consectetur massa.
                  </Card.Text>
                  <Link to="/individual-poster">
                    <Button variant="primary" size="lg">
                      Select
                    </Button>
                  </Link>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={12} md={4}>
              <Card style={{ width: "21rem" }}>
                <Card.Img variant="top" src={ComboPosterImg} />
                <Card.Body>
                  <Card.Title>Socks</Card.Title>
                  <Card.Text>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                    Aliquam eget odio ac massa ullamcorper lacinia. Donec et
                    tristique orci. Sed vitae lectus condimentum, sollicitudin
                    mauris vitae, consectetur massa.
                  </Card.Text>
                  <Link to="/socks">
                    <Button variant="primary" size="lg">
                      Select
                    </Button>
                  </Link>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={12} md={4}>
              <Card style={{ width: "21rem" }}>
                <Card.Img variant="top" src={PhotoDayImg} />
                <Card.Body>
                  <Card.Title>Photo Day</Card.Title>
                  <Card.Text>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                    Aliquam eget odio ac massa ullamcorper lacinia. Donec et
                    tristique orci. Sed vitae lectus condimentum, sollicitudin
                    mauris vitae, consectetur massa.
                  </Card.Text>
                  <Link to="/photo-day">
                    <Button variant="primary" size="lg">
                      Select
                    </Button>
                  </Link>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>
    );
  }
}

export default Home;
